import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { useRoomDetails } from "../RoomContext";
import Navbar from "./Navbar";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Profile() {
  const { isSignedIn, user } = useUser();
  const [username, setUsername] = useState("");
  const [isUserSaved, setIsUserSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sites, setSites] = useState(["codeforces", "codechef"]);
  const [currentSite, setCurrentSite] = useState("all");
  const [cf, setcf] = useState({});
  const [platformUsernames, setPlatformUsernames] = useState({
    codeforces: "",
    codechef: "",
    leetcode: "",
    codingninjas: "",
  });
  const [isEditingPlatforms, setIsEditingPlatforms] = useState(false);

  useEffect(() => {
    axios
      .get("https://codeforces.com/api/user.info?handles=michael_muthuraj")
      .then((response) => {
        console.log(response.data.result[0]);

        setcf(response.data.result[0]); // Prettified JSON
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);
  const ratingData = [
    { year: "2022-01", rating: 850 },
    { year: "2022-06", rating: 1100 },
    { year: "2022-09", rating: 1050 },
    { year: "2022-12", rating: 1150 },
    { year: "2023-03", rating: 1220 },
    { year: "2023-06", rating: 1280 },
    { year: "2023-09", rating: 1300 },
    { year: "2023-12", rating: 1370 },
    { year: "2024-03", rating: 1420 },
    { year: "2024-06", rating: 1390 },
    { year: "2024-09", rating: 1410 },
    { year: "2024-12", rating: 1400 },
  ];
  const [userDetails, setuserDetails] = useState({});
  useEffect(() => {
    setuserDetails(JSON.parse(localStorage.getItem("userdetails")));
  }, []);
  useEffect(() => {
    const saveUserData = async () => {
      if (!user || isUserSaved) return;

      try {
        const userData = {
          clerkId: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
          finalRating: user.finalRating,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
        };

        localStorage.setItem("clerkId", user.id);

        const response = await axios.post(
          "https://zenith-4-0-http.onrender.com/api/users/save-user",
          userData
        );
        if (response.data.success) {
          setIsUserSaved(true);
          await fetchUpdatedUserData();
        }
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    };

    if (isSignedIn) {
      saveUserData();
    }
  }, [isSignedIn, user, isUserSaved]);

  const fetchUpdatedUserData = async () => {
    const clerkId = localStorage.getItem("clerkId");
    if (!clerkId) return;
    try {
      setLoading(true);
      const response = await axios.get(
        ` https://zenith-4-0-http.onrender.com/api/users/getUser/${clerkId}`
      );
      if (response.data.success) {
        const updatedUser = response.data.user;
        console.log(updatedUser);
        localStorage.setItem("userdetails", JSON.stringify(updatedUser));
        setUsername(updatedUser.username);
      }
    } catch (err) {
      setError("Error fetching updated user data");
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUpdatedUserData();
  }, []);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handleUsernameSubmit = async () => {
    // Clear any previous errors before submission
    setError(null);

    // FIX: Add validation to check for underscores in the username.
    if (username.includes("_")) {
      setError(
        "Username cannot contain underscores (_). Please choose another."
      );
      return; // Stop the submission if the username is invalid
    }

    const storedUserDetails = localStorage.getItem("userdetails");
    if (!storedUserDetails) return;

    const parsedUser = JSON.parse(storedUserDetails);
    const updatedData = { ...parsedUser, username };

    try {
      const response = await axios.put(
        "https://zenith-4-0-http.onrender.com/api/users/update-username",
        updatedData
      );
      if (response.data.success) {
        await fetchUpdatedUserData();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating username:", error);
      setError("Failed to update username. It might already be taken.");
    }
  };

  const handlePlatformUsernameChange = (platform, value) => {
    setPlatformUsernames((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };

  const handlePlatformUsernamesSubmit = () => {
    // For now, just log the usernames - no backend integration
    console.log("Platform usernames:", platformUsernames);
    setIsEditingPlatforms(false);
  };

  if (!isSignedIn) {
    return (
      <>
        <Navbar />
        <BackgroundBeamsWithCollision className="min-h-screen">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-lg text-red-400">
              Please sign in to view your profile.
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="w-full min-h-screen flex p-5 pt-20">
          {/* Added pt-20 for navbar spacing */}
          {/* Sidebar */}
          <div
            className="w-[25%] p-6 rounded-2xl shadow-md flex flex-col items-center relative z-10 border border-white/10"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Profile Image */}
            <div className="flex justify-center mb-4">
              <img
                src={user.imageUrl}
                alt="User Avatar"
                className="w-[250px] h-[250px] rounded-full border border-gray-800 shadow-inner"
              />
            </div>

            {/* User Details */}
            <div className="text-white w-full flex flex-col items-center text-center space-y-3 text-lg">
              {/* Username */}
              <div>
                <span className="font-semibold">Username:</span>{" "}
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    className="border-b-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-white placeholder-white/60"
                  />
                ) : (
                  <span>{username}</span>
                )}
              </div>

              {/* Full Name */}
              <p>
                <span className="font-semibold">Full Name:</span>{" "}
                {user.fullName}
              </p>

              {/* Email */}
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {user.primaryEmailAddress?.emailAddress}
              </p>

              {/* Created At */}
              <p>
                <span className="font-semibold">Created At:</span>{" "}
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Divider */}
            <div className="w-[90%] border-t-2 border-white/20 mt-6 mb-4"></div>

            {/* Buttons / Loading / Error */}
            <div className="w-full flex flex-col items-center">
              {loading && (
                <div className="text-center mt-2 text-lg text-white/80">
                  Updating profile...
                </div>
              )}
              {error && (
                <div className="text-center mt-2 text-lg text-red-400">
                  {error}
                </div>
              )}
              {isEditing ? (
                <div className="mt-2 flex space-x-4">
                  <button
                    onClick={handleUsernameSubmit}
                    className="bg-blue-500/80 text-white px-4 py-2 rounded-full hover:bg-blue-600/80 backdrop-blur-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-white/70 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500/80 text-white px-4 py-2 rounded-full mt-2 hover:bg-blue-600/80 backdrop-blur-sm"
                >
                  Edit Username
                </button>
              )}
            </div>

            {/* Second Divider */}
            <div className="w-[90%] border-t-2 border-white/20 mt-6 mb-4"></div>

            {/* Platform Usernames Section */}
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="text-white w-full flex flex-col items-center text-center space-y-3 text-lg">
                {/* Codeforces */}
                <div className="w-full">
                  <span className="font-semibold">Codeforces:</span>{" "}
                  {isEditingPlatforms ? (
                    <input
                      type="text"
                      value={platformUsernames.codeforces}
                      onChange={(e) =>
                        handlePlatformUsernameChange(
                          "codeforces",
                          e.target.value
                        )
                      }
                      placeholder="Enter Codeforces username"
                      className="border-b-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-white placeholder-white/60 ml-2"
                    />
                  ) : (
                    <span>{platformUsernames.codeforces || "Not set"}</span>
                  )}
                </div>

                {/* CodeChef */}
                <div className="w-full">
                  <span className="font-semibold">CodeChef:</span>{" "}
                  {isEditingPlatforms ? (
                    <input
                      type="text"
                      value={platformUsernames.codechef}
                      onChange={(e) =>
                        handlePlatformUsernameChange("codechef", e.target.value)
                      }
                      placeholder="Enter CodeChef username"
                      className="border-b-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-white placeholder-white/60 ml-2"
                    />
                  ) : (
                    <span>{platformUsernames.codechef || "Not set"}</span>
                  )}
                </div>

                {/* LeetCode */}
                <div className="w-full">
                  <span className="font-semibold">LeetCode:</span>{" "}
                  {isEditingPlatforms ? (
                    <input
                      type="text"
                      value={platformUsernames.leetcode}
                      onChange={(e) =>
                        handlePlatformUsernameChange("leetcode", e.target.value)
                      }
                      placeholder="Enter LeetCode username"
                      className="border-b-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-white placeholder-white/60 ml-2"
                    />
                  ) : (
                    <span>{platformUsernames.leetcode || "Not set"}</span>
                  )}
                </div>

                {/* Coding Ninjas */}
                <div className="w-full">
                  <span className="font-semibold">Coding Ninjas:</span>{" "}
                  {isEditingPlatforms ? (
                    <input
                      type="text"
                      value={platformUsernames.codingninjas}
                      onChange={(e) =>
                        handlePlatformUsernameChange(
                          "codingninjas",
                          e.target.value
                        )
                      }
                      placeholder="Enter Coding Ninjas username"
                      className="border-b-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-white placeholder-white/60 ml-2"
                    />
                  ) : (
                    <span>{platformUsernames.codingninjas || "Not set"}</span>
                  )}
                </div>
              </div>

              {/* Platform Usernames Edit Buttons */}
              <div className="w-full flex justify-center">
                {isEditingPlatforms ? (
                  <div className="mt-2 flex space-x-4">
                    <button
                      onClick={handlePlatformUsernamesSubmit}
                      className="bg-green-500/80 text-white px-4 py-2 rounded-full hover:bg-green-600/80 backdrop-blur-sm"
                    >
                      Save Platforms
                    </button>
                    <button
                      onClick={() => setIsEditingPlatforms(false)}
                      className="text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPlatforms(true)}
                    className="bg-green-500/80 text-white px-4 py-2 rounded-full mt-2 hover:bg-green-600/80 backdrop-blur-sm"
                  >
                    Edit Platforms
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 ml-6 flex flex-col">
            {/* Top Row: Rating Tile + Chart Tile */}
            <div className="flex w-full gap-6 mb-6">
              {/* Rating Tile */}
              <div
                className="w-[250px] h-[250px] shadow-md rounded-2xl p-4 relative flex flex-col justify-center items-center border border-white/10"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {/* Info Icon */}
                <div className="absolute top-3 right-3 text-white/60">
                  <i className="fas fa-info-circle"></i> {/* optional icon */}
                </div>

                {/* Heading */}
                <p className="text-lg font-semibold text-white/80 mb-2">
                  Rating
                </p>

                {/* Big Number */}
                <p className="text-5xl font-bold text-white">
                  {userDetails.finalRating}
                </p>
              </div>

              {/* Chart Tile */}
              <div
                className="flex-1 shadow-md rounded-2xl p-4 flex flex-col border border-white/10"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Rating Progress
                  </h2>
                  <div className="text-white/60 cursor-pointer">
                    <i className="fas fa-info-circle"></i> {/* optional icon */}
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ratingData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.2)"
                      />
                      <XAxis dataKey="year" tick={{ fill: "white" }} />
                      <YAxis domain={[800, 1600]} tick={{ fill: "white" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "8px",
                          color: "white",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#fff"
                        strokeWidth={2}
                        dot={{ fill: "#fff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="w-full flex gap-10">
              {/* Codeforces Tile */}
              <div
                className="w-[450px] shadow-lg rounded-3xl p-8 flex flex-col items-center border border-white/10"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  backdropFilter: "blur(5px)",
                }}
              >
                <p className="text-3xl font-extrabold text-white mb-8">
                  Codeforces
                </p>
                <div className="flex gap-8">
                  {/* Rating Box */}
                  <div
                    className="p-8 rounded-2xl flex flex-col items-center w-[160px] border border-white/10"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.025)",
                      backdropFilter: "blur(5px)",
                    }}
                  >
                    <p className="text-lg font-semibold text-white/80 mb-2">
                      Rating
                    </p>
                    <p className="text-4xl font-extrabold text-white">
                      {cf.rating}
                    </p>
                  </div>
                  {/* Rank Box */}
                  <div
                    className="p-8 rounded-2xl flex flex-col items-center w-[160px] border border-white/10"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.025)",
                      backdropFilter: "blur(5px)",
                    }}
                  >
                    <p className="text-lg font-semibold text-white/80 mb-2">
                      Rank
                    </p>
                    <p className="text-4xl font-extrabold text-white">
                      {cf.rank}
                    </p>
                  </div>
                </div>
              </div>

              {/* CodeChef Tile */}
              <div
                className="w-[450px] shadow-lg rounded-3xl p-8 flex flex-col items-center border border-white/10"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.002)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-3xl font-extrabold text-white mb-8">
                  CodeChef
                </p>
                <div className="flex gap-8">
                  {/* Rating Box */}
                  <div
                    className="p-8 rounded-2xl flex flex-col items-center w-[160px] border border-white/10"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.025)",
                      backdropFilter: "blur(100px)",
                    }}
                  >
                    <p className="text-lg font-semibold text-white/80 mb-2">
                      Rating
                    </p>
                    <p className="text-4xl font-extrabold text-white">
                      {cf.rating}
                    </p>
                  </div>
                  {/* Rank Box */}
                  <div
                    className="p-8 rounded-2xl flex flex-col items-center w-[160px] border border-white/10"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.025)",
                      backdropFilter: "blur(100px)",
                    }}
                  >
                    <p className="text-lg font-semibold text-white/80 mb-2">
                      Rank
                    </p>
                    <p className="text-4xl font-extrabold text-white">
                      {cf.rank}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* You can add more sections below if needed */}
          </div>
        </div>
      </BackgroundBeamsWithCollision>
    </>
  );
}
