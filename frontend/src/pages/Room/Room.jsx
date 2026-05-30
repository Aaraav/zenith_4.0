import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import { useRoomDetails } from "../../RoomContext";
import { api } from "../../lib/api";
import { sanitizeQuestion } from "../../lib/sanitize";

// Components
import Compiler from "../Compiler";
import VideoCallInner from "./VideoCallInner"; // Moved to separate for clarity

const APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useRoomDetails();

  const [questions, setQuestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [compilerUsers, setCompilerUsers] = useState(null);
  const [agoraToken, setAgoraToken] = useState(null);
  const [agoraUid, setAgoraUid] = useState(0);
  const [tokenError, setTokenError] = useState(null);

  const agoraClient = useRef(
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }),
  );

  useEffect(() => {
    let loggedInUser = null;
    try {
      const stored = localStorage.getItem("userdetails");
      if (stored) loggedInUser = JSON.parse(stored).username?.trim();
    } catch {}
    setCurrentUser(loggedInUser || roomId?.split("_")[0] || "Guest");
  }, [roomId]);

  useEffect(() => {
    if (!currentUser) return;
    const [u1, u2] = roomId.split("_");
    setCompilerUsers(
      currentUser === u1 ? { user1: u1, user2: u2 } : { user1: u2, user2: u1 },
    );
  }, [currentUser, roomId]);

  useEffect(() => {
    if (!roomId) return;

    // 1. Initial sync from localStorage for immediate UI
    const stored = localStorage.getItem(`latestQuestion_${roomId}`);
    if (stored) {
      try { setQuestions(JSON.parse(stored)); } catch {}
    }

    // 2. Authoritative sync from Backend
    api.get(`/api/rooms/${roomId}`)
      .then(res => {
        if (res.data.success && res.data.room.question) {
          const qData = {
            questionData: res.data.room.questionData,
            question: res.data.room.question,
            timestamp: res.data.room.createdAt,
            roomId: res.data.room.roomId
          };
          setQuestions([qData]);
          localStorage.setItem(`latestQuestion_${roomId}`, JSON.stringify([qData]));
        }
      })
      .catch(err => console.error("Failed to sync room data:", err));

    // 3. Agora Token
    api
      .get(`/api/agora/token?channel=${encodeURIComponent(roomId)}&uid=0`)
      .then((res) => {
        setAgoraToken(res.data.token);
        setAgoraUid(res.data.uid);
      })
      .catch(() => setTokenError("Video service unavailable."));
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const join = () => socket.emit("joinRoom", { roomId });
    join();

    const onQuestion = (data) => {
      setQuestions([data]);
      localStorage.setItem(`latestQuestion_${roomId}`, JSON.stringify([data]));
    };

    socket.on("connect", join);
    socket.on("question-generated", onQuestion);

    socket.on("opponentDisconnected", () => {
      alert("Opponent left.");
      navigate("/");
    });

    return () => {
      socket.off("connect", join);
      socket.off("question-generated", onQuestion);
      socket.off("opponentDisconnected");
    };
  }, [socket, roomId, navigate]);

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <main className="flex flex-1 pt-16 overflow-hidden">
        {/* Left: Video & Chat (40% width) */}
        <section className="w-[40%] border-r border-white/10 relative bg-gray-950">
          {tokenError ? (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              {tokenError}
            </div>
          ) : agoraToken ? (
            <AgoraRTCProvider client={agoraClient.current}>
              <VideoCallInner
                channelName={roomId}
                token={agoraToken}
                uid={agoraUid}
                onLeave={() => navigate("/")}
                socket={socket}
                currentUser={currentUser}
                roomId={roomId}
              />
            </AgoraRTCProvider>
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 animate-pulse">
              Initializing Stream...
            </div>
          )}
        </section>

        {/* Right: Question & Code (60% width) */}
        <section className="w-[60%] flex flex-col bg-[#0a0a0a]">
          {/* Question Area */}
          <div 
            className="h-[35%] p-5 overflow-y-auto border-b border-white/10 bg-white/[0.02] select-none"
            onCopy={(e) => {
              e.preventDefault();
              alert("Copying the problem statement is not allowed!");
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--color-primary)]">
                Problem Statement
              </h2>
              {questions.length > 0 && (
                <span className="text-[10px] text-white/30 font-mono">
                  {new Date(
                    questions[questions.length - 1].timestamp,
                  ).toLocaleTimeString()}
                </span>
              )}
            </div>

            {questions.length > 0 ? (
              <div
                className="prose prose-invert prose-sm max-w-none text-white/80"
                dangerouslySetInnerHTML={{
                  __html: sanitizeQuestion(
                    questions[questions.length - 1].question,
                  ),
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-20 text-white/20 text-sm italic">
                Generating problem...
              </div>
            )}
          </div>

          {/* Compiler Area */}
          <div className="flex-1 relative">
            {compilerUsers ? (
              <Compiler
                user1={compilerUsers.user1}
                user2={compilerUsers.user2}
                room={roomId}
                questions={questions}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20">
                Loading Editor...
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Room;
