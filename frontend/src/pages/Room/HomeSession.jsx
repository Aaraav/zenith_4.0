import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import Navbar from "../Navbar";
import { BackgroundBeamsWithCollision } from "../../components/ui/background-beams-with-collision";

const HomeSession = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoinRoom = useCallback(() => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  }, [roomId, navigate]);

  return (
    <>
      <Navbar />
      <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="h-screen flex flex-col items-center justify-center px-4 pt-20">
          <div 
            className="p-8 rounded-2xl shadow-lg border border-white/10 max-w-md w-full"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h1 className="text-4xl font-bold text-white mb-2 text-center">ZegoCloud Video Chat</h1>
            <p className="text-lg text-white/70 mb-6 text-center">
              Enter a Room ID to join a video call
            </p>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2 text-lg border border-white/30 rounded mb-4 focus:outline-none focus:border-white bg-transparent text-white placeholder-white/60"
            />
            <button
              onClick={handleJoinRoom}
              className="w-full px-6 py-2 text-lg text-white bg-blue-500/80 rounded hover:bg-blue-600/80 transition backdrop-blur-sm"
            >
              Join Room
            </button>
          </div>
        </div>
      </BackgroundBeamsWithCollision>
    </>
  );
};

export default HomeSession;
