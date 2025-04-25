import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const HomeSession = () => {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoinRoom = useCallback(() => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  }, [roomId, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">ZegoCloud Video Chat</h1>
      <p className="text-lg text-gray-600 mb-6 text-center">
        Enter a Room ID to join a video call
      </p>
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="w-full max-w-md px-4 py-2 text-lg border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        onClick={handleJoinRoom}
        className="px-6 py-2 text-lg text-white bg-blue-600 rounded hover:bg-blue-700 transition"
      >
        Join Room
      </button>
    </div>
  );
};

export default HomeSession;
