import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/stateful-button";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { useUser, SignInButton, SignedOut } from "@clerk/clerk-react";
import axios from "axios";

// ✅ Removed `socketId` from props as it's redundant.
// We can get the most current ID from the `socket` object itself.
export default function Home({ socket }) {
  const navigate = useNavigate();
  const { user,isSignedIn } = useUser();
  const [name, setName] = useState("Guest");
  const [selectedTopic, setSelectedTopic] = useState("DSA");
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [matchedMsg, setMatchedMsg] = useState("");
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Effect 1: Handles fetching user data.
  // Why this is better: This effect now *only* runs when the user's sign-in
  // status changes, which is the correct behavior.
  useEffect(() => {
    const fetchUsername = async () => {
      console.log(user);
      const clerkId = user?.id || localStorage.getItem("clerkId");
      if (!isSignedIn || !clerkId) {
        // Clean up state on sign-out
        setName("Guest");
        setRatings([]);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `https://zenith-4-0-http.onrender.com/api/users/getUser/${clerkId}`
        );

        if (response.data.success && response.data.user) {
          const user = response.data.user;
          const username = user.username?.trim();
          
          if (username) {
            setName(username);
          }
          setRatings(user.ratings || []);
          localStorage.setItem("userdetails", JSON.stringify(user));
        }
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsername();
  }, [isSignedIn]);

  // ✅ Effect 2: Handles socket event listeners.
  // Why this is better: Separating this from data fetching makes the code cleaner.
  // It correctly sets up and tears down the listener when the socket connection changes.
  useEffect(() => {
    if (!socket) return;

    const onRoomJoined = ({ roomId, users }) => {
      console.log(`🎉 Matched and joined room: ${roomId} with users:`, users);
      localStorage.setItem("socketId", socket.id);
      setRoomId(roomId);
      setMatchedMsg(`🎉 You have been matched with a user!`);
      navigate(`/room/${roomId}`);
    };

    socket.on("roomJoined", onRoomJoined);

    // Cleanup function to prevent memory leaks
    return () => {
      socket.off("roomJoined", onRoomJoined);
    };
  }, [socket, navigate]);

  // ✅ Effect 3: Recalculates average rating. (No change needed)
  useEffect(() => {
    if (ratings.length > 0) {
      const total = ratings.reduce((sum, r) => sum + r, 0);
      setAverageRating(total / ratings.length);
    } else {
      setAverageRating(0);
    }
  }, [ratings]);

  const handleSendData = () => {
    if (name === "Guest" || !name.trim()) {
      setShowUsernamePopup(true);
      return;
    }

    if (!socket || !selectedTopic || averageRating === undefined) {
      console.error("⚠️ Invalid data or socket connection");
      return;
    }

    localStorage.setItem("selectedTopic", selectedTopic);

    // ✅ Use `socket.id` directly for the most up-to-date ID.
    socket.emit("joinQueue", {
      username: name,
      topic: selectedTopic,
      averageRating,
      socketId: socket.id,
    });

    // Keep the button in a loading state until a match is found and we navigate away.
    return new Promise(() => {});
  };

  const handleGoToProfile = () => {
    setShowUsernamePopup(false);
    navigate("/profile");
  };

  const handleClosePopup = () => {
    setShowUsernamePopup(false);
  };

  // The JSX remains unchanged as it was already well-structured.
  return (
    <>
      <BackgroundBeamsWithCollision className="min-h-screen h-[100vh] absolute top-0">
        <div className="flex items-center justify-center min-h-screen">
          <div
            className="w-full max-w-xl mx-4 p-6 rounded-2xl shadow-md relative z-10 border border-white/10"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(2px)",
            }}
          >
            <h1 className="text-3xl font-bold text-center mb-6 text-white">
              Start Competing
            </h1>

            <div className="text-center mt-10 text-xl font-bold text-white">
              Hello, {name}!
            </div>

            {matchedMsg && (
              <div className="text-green-400 text-center mt-6 font-semibold">
                {matchedMsg}
              </div>
            )}

            {!roomId && (
              <div className="mt-6 text-center">
                {isSignedIn ? (
                  <Button onClick={handleSendData}>
                    Join Matchmaking Queue
                  </Button>
                ) : (
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="w-full py-3 px-6 bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white font-semibold rounded-xl hover:from-blue-600/80 hover:to-purple-700/80 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-lg">
                        Sign In to Join Matchmaking
                      </button>
                    </SignInButton>
                  </SignedOut>
                )}
              </div>
            )}
          </div>
        </div>
      </BackgroundBeamsWithCollision>

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