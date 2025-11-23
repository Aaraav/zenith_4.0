import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import Compiler from "../Compiler";
import Navbar from "../Navbar";

const Room = ({ socket }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Ref to store the Zego instance so we can destroy it properly
  const zpRef = useRef(null);
  
  // State management
  const [questions, setQuestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [compilerUsers, setCompilerUsers] = useState(null);

  // --- 1. User Identification Logic ---
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
      const [u1] = roomId ? roomId.split("_") : ["Guest"];
      setCurrentUser(u1 || "Guest");
    }
  }, [roomId]);

  // --- 2. Compiler User Order Logic ---
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

  // --- 3. Load Saved Questions ---
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

  // --- 4. Socket Logic ---
  useEffect(() => {
    if (!socket) return;

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

    const handleOpponentDisconnected = () => {
      alert("Your opponent has left the room. You will be redirected.");
      // Cleanup Zego before navigating
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
      navigate("/");
    };

    socket.on("question-generated", handleQuestion);
    socket.on("questionError", handleError);
    socket.on("opponentDisconnected", handleOpponentDisconnected);

    return () => {
      socket.off("question-generated", handleQuestion);
      socket.off("questionError", handleError);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
    };
  }, [socket, roomId, navigate]);

  // --- 5. Zego Initialization (Callback Ref Pattern) ---
 
  const myMeeting = useCallback(async (element) => {
    // 1. If we are unmounting (element is null) or re-mounting, destroy the old instance first.
    if (zpRef.current) {
      console.log("Destroying previous Zego instance...");
      try {
        zpRef.current.destroy();
      } catch (err) {
        console.warn("Error destroying Zego instance:", err);
      }
      zpRef.current = null;
    }

    // 2. If element exists and we have a user, create a new instance.
    if (element && currentUser) {
      console.log("Initializing Zego for user:", currentUser);
      
      const appId = 1891360647; 
      const serverSecret = "cb5bed191b9d7447f597fe54dea09d16"; 
      
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        Date.now().toString(),
        currentUser
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;

      try {
        zp.joinRoom({
          container: element,
          prejoinView: false,
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          sharedLinks: [{
            name: "Copy Link",
            url: `${window.location.origin}/room/${roomId}`,
          }],
          scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
          showScreenSharingButton: false,
          onLeaveRoom: () => {
            navigate('/');
          },
          // Add error handling callbacks if available or needed
        });
      } catch (error) {
        console.error("Zego Join Room Failed:", error);
      }
    }
  }, [currentUser, roomId, navigate]);

  return (
    <>
      <Navbar />
      <div className="bg-black min-h-screen">
        <div className="relative w-screen h-screen flex overflow-hidden pt-20">
          {/* Video Call Container */}
          <div className="w-[50vw] h-full bg-gray-900 relative">
             {/* We conditionally render the DIV. 
                 The 'ref' callback (myMeeting) will trigger ONLY when currentUser is ready 
                 and the div is physically placed in the DOM. */}
             {currentUser ? (
               <div 
                 ref={myMeeting} 
                 className="w-full h-full"
               />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-gray-900 z-10">
                 Loading User Profile...
               </div>
             )}
          </div>
          
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
