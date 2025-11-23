import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import Compiler from "../Compiler";
import Navbar from "../Navbar";

const Room = ({ socket }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Refs for DOM element and Zego instance
  const containerRef = useRef(null);
  const zegoInstanceRef = useRef(null);

  // State management
  const [questions, setQuestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [compilerUsers, setCompilerUsers] = useState(null);

  // Effect to identify the current user from localStorage
  useEffect(() => {
    let loggedInUser = null;
    const userDetailsString = localStorage.getItem("userdetails");
    if (userDetailsString) {
      try {
        const userDetails = JSON.parse(userDetailsString);
        loggedInUser = userDetails.username?.trim();
      } catch (error) {
        console.error("Error parsing 'userdetails' from localStorage:", error);
      }
    }
    
    if (loggedInUser) {
      setCurrentUser(loggedInUser);
    } else {
      console.error("CRITICAL: Could not find 'username' in localStorage.");
      // Fallback to derive user from roomId if not found in storage
      const [u1] = roomId.split("_");
      setCurrentUser(u1);
    }
  }, [roomId]);

  // Effect to determine the opponent and set user order for the compiler
  useEffect(() => {
    if (currentUser) {
      const [u1, u2] = roomId.split("_");
      if (currentUser === u1) {
        setCompilerUsers({ user1: u1, user2: u2 });
      } else {
        setCompilerUsers({ user1: u2, user2: u1 });
      }
    }
  }, [currentUser, roomId]);

  // Effect to load any saved questions from a previous session
  useEffect(() => {
    const savedQuestion = localStorage.getItem(`latestQuestion_${roomId}`);
    if (savedQuestion) {
      try {
        const parsed = JSON.parse(savedQuestion);
        if (Array.isArray(parsed)) {
          setQuestions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse questions from localStorage", e);
      }
    }
  }, [roomId]);

  // Main effect for initializing Zego, handling socket events, and cleaning up
  useEffect(() => {
    // Wait until all required data is available
    if (!socket || !compilerUsers || !currentUser) return;

    // --- 1. Socket Event Handlers ---

    const handleQuestion = (data) => {
      setQuestions([data]);
      localStorage.setItem(`latestQuestion_${roomId}`, JSON.stringify([data]));
    };

    const handleError = (error) => {
      console.error("Error generating question:", error);
      setQuestions([{
        question: "❌ Failed to generate question",
        timestamp: new Date().toISOString(),
        error: error.message || "Unknown error",
      }]);
    };

    // Handles the auto-exit functionality
    const handleOpponentDisconnected = () => {
      alert("Your opponent has left the room. You will be redirected.");
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current.destroy();
        zegoInstanceRef.current = null;
      }
      navigate("/");
    };

    socket.on("question-generated", handleQuestion);
    socket.on("questionError", handleError);
    socket.on("opponentDisconnected", handleOpponentDisconnected);

    // --- 2. Zego Video Call Initialization ---

    // Initialize only if the container exists and a Zego instance hasn't been created yet
    if (containerRef.current && !zegoInstanceRef.current) {
     const appId = 1891360647; // Your App ID
      const serverSecret = "cb5bed191b9d7447f597fe54dea09d16"; // Your Server Secret
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        Date.now().toString(),
        currentUser
      );

      const zc = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zc; // Store instance in ref

      zc.joinRoom({
        container: containerRef.current,
        prejoinView: false,
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        sharedLinks: [{
          name: "Copy Link",
          url: `${window.location.origin}/room/${roomId}`,
        }],
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showScreenSharingButton: false,
      });
    }

    // --- 3. Cleanup Function ---

    // This runs when the component unmounts (e.g., user navigates away)
    return () => {
      console.log("Cleaning up Room component...");
      socket.off("question-generated", handleQuestion);
      socket.off("questionError", handleError);
    socket.off("opponentDisconnected", handleOpponentDisconnected);

      // Destroy the Zego instance to release camera/mic and resources
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current.destroy();
        zegoInstanceRef.current = null;
      }
    };
  }, [socket, compilerUsers, currentUser, roomId, navigate]);

  return (
    <>
      <Navbar />
      <div className="bg-black min-h-screen">
        <div className="relative w-screen h-screen flex overflow-hidden pt-20">
          {/* Video Call Container */}
          <div ref={containerRef} className="w-[50vw] h-full" />
          
          <div className="flex flex-col w-[50vw]">
            {/* Questions Box */}
            <div
              className="w-full h-[50vh] p-6 overflow-y-auto border border-white/10"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h2 className="text-xl font-bold mb-4 text-white">
                AI CP/DSA Questions
              </h2>
              <ul className="space-y-4">
                {questions.length > 0 &&
                  (() => {
                    const lastQuestion = questions[questions.length - 1];
                    return (
                      <li
                        className="p-3 rounded shadow border border-white/10"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          backdropFilter: "blur(5px)",
                        }}
                      >
                        <div className="text-sm text-white/70 mb-1">
                          Latest Question -{" "}
                          {new Date(lastQuestion.timestamp).toLocaleTimeString()}
                        </div>
                        <div
                          className="text-white/90"
                          dangerouslySetInnerHTML={{
                            __html: lastQuestion.question,
                          }}
                        />
                      </li>
                    );
                  })()}
              </ul>
            </div>

            {/* Compiler Box */}
            <div className="flex flex-wrap h-[50vh] w-full">
              {compilerUsers ? (
                <Compiler
                  socket={socket}
                  user1={compilerUsers.user1}
                  user2={compilerUsers.user2}
                  room={roomId}
                  questions={questions}
                />
              ) : (
                <div
                  className="p-4 text-center w-full border border-white/10 flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div className="text-white/80">Initializing compiler...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Room;
