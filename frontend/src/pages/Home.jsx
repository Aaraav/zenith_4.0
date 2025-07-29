import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Home({ socketId, socket }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("DSA");
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [matchedMsg, setMatchedMsg] = useState("");
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);

  useEffect(() => {
    // Fetch user details from localStorage
    const userDetails = localStorage.getItem("userdetails");
    if (userDetails) {
      const parsed = JSON.parse(userDetails);
      const username = parsed.username?.trim();
      setName(username && username.length > 0 ? username : "Guest");
      setRatings(parsed.ratings || []);
    } else {
      setName("Guest");
    }

    // Listen for roomJoined event from the server
    if (socket) {
      socket.on("roomJoined", ({ roomId, users }) => {
        console.log(`🎉 Matched and joined room: ${roomId} with users:`, users);
        const hasTwoUsersWithNames =
          users.filter((u) => u.username).length === 2;
        localStorage.setItem("socketId", socket.id); // Store socketId for future use
        setRoomId(roomId); // Store roomId to conditionally show matched message
        setMatchedMsg(
          `🎉 You have been matched with a user! Room ID: ${roomId}`
        );
        navigate(`/room/${roomId}`);
      });
    }

    // Cleanup the socket listener when component unmounts
    return () => {
      if (socket) {
        socket.off("roomJoined");
      }
    };
  }, [socket, navigate]); // Dependency on socket to re-run when socket is initialized

  useEffect(() => {
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
      setAverageRating(totalRating / ratings.length);
    } else {
      setAverageRating(0);
    }
  }, [ratings]);

  const handleSendData = () => {
    // Check if user has no username or has "Guest" as username
    if (!name || name.trim() === "" || name === "Guest") {
      setShowUsernamePopup(true);
      return;
    }

    if (!selectedTopic || averageRating === undefined) {
      console.error("⚠️ Invalid data");
      return;
    }

    localStorage.setItem("selectedTopic", selectedTopic);

    if (socket) {
      socket.emit("joinQueue", {
        username: name,
        topic: selectedTopic,
        averageRating,
        socketId, // Pass the socketId when emitting data
      });
    }
  };

  const handleGoToProfile = () => {
    setShowUsernamePopup(false);
    navigate("/profile");
  };

  const handleClosePopup = () => {
    setShowUsernamePopup(false);
  };

  return (
    <>
      {/* <Navbar/> */}
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-2xl shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Start Competing
        </h1>

        <div className="text-center mt-10 text-xl font-bold">
          Hello, {name || "Guest"}!
        </div>

        {matchedMsg && (
          <div className="text-green-600 text-center mt-6 font-semibold">
            {matchedMsg}
          </div>
        )}

        {!roomId && (
          <div className="mt-6 text-center">
            <button
              onClick={handleSendData}
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
            >
              Join Matchmaking Queue
            </button>
          </div>
        )}
      </div>

      {/* Username Required Popup */}
      {showUsernamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Username Required
              </h3>
              <p className="text-gray-600 mb-6">
                You need to set a username to join the matchmaking queue. Please
                go to your profile page to set up your username.
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleGoToProfile}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  Go to Profile
                </button>
                <button
                  onClick={handleClosePopup}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-full hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
