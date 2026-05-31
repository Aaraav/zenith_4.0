import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/stateful-button";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { useUser, SignInButton, SignedOut } from "@clerk/clerk-react";
import { api } from "../lib/api";
import { useRoomDetails } from "../RoomContext";

export default function Home() {
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const { socket } = useRoomDetails();
  const [name, setName] = useState("Guest");
  const [selectedTopic] = useState("DSA");
  const [roomId, setRoomId] = useState(null);
  const [matchedMsg, setMatchedMsg] = useState("");
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!isSignedIn || !user?.id) {
        setName("Guest");
        return;
      }
      try {
        const response = await api.get(`/api/users/getUser/${user.id}`);
        if (response.data.success && response.data.user) {
          const u = response.data.user;
          if (u.username?.trim()) setName(u.username.trim());
          localStorage.setItem("userdetails", JSON.stringify(u));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUsername();
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (!socket) return undefined;

    const onRoomJoined = ({ roomId: rid, users }) => {
      // eslint-disable-next-line no-console
      console.log(`Matched and joined room: ${rid} with users:`, users);
      setRoomId(rid);
      setMatchedMsg("🎉 You have been matched!");
      navigate(`/room/${rid}`);
    };

    socket.on("roomJoined", onRoomJoined);
    return () => socket.off("roomJoined", onRoomJoined);
  }, [socket, navigate]);

  const handleSendData = () => {
    if (name === "Guest" || !name.trim()) {
      setShowUsernamePopup(true);
      return undefined;
    }
    if (!socket || !selectedTopic) {
      // eslint-disable-next-line no-console
      console.error("Socket not ready or topic missing");
      return undefined;
    }
    localStorage.setItem("selectedTopic", selectedTopic);
    socket.emit("joinQueue", { topic: selectedTopic });
    return new Promise(() => {});
  };

  const handleGoToProfile = () => {
    setShowUsernamePopup(false);
    navigate("/profile");
  };

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
                  <Button onClick={handleSendData}>Join Matchmaking Queue</Button>
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

      {showUsernamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
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
                  onClick={() => setShowUsernamePopup(false)}
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
