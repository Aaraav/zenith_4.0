import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { useRoomDetails } from "../RoomContext";
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

  useEffect(() => {
    axios.get('https://codeforces.com/api/user.info?handles=michael_muthuraj')
      .then(response => {
        console.log(response.data.result[0]);
        
        setcf(response.data.result[0]); // Prettified JSON
      })
      .catch(error => {
        console.error('Error fetching data:', error);
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
  useEffect(()=>{
     setuserDetails(JSON.parse(localStorage.getItem('userdetails')));
  },[])
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
          "http://localhost:4000/api/users/save-user",
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
       ` http://localhost:4000/api/users/getUser/${clerkId}`
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
    if (username.includes('_')) {
      setError("Username cannot contain underscores (_). Please choose another.");
      return; // Stop the submission if the username is invalid
    }

    const storedUserDetails = localStorage.getItem("userdetails");
    if (!storedUserDetails) return;

    const parsedUser = JSON.parse(storedUserDetails);
    const updatedData = { ...parsedUser, username };

    try {
      const response = await axios.put(
        "http://localhost:4000/api/users/update-username",
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

  if (!isSignedIn) {
    return (
      <div className="text-center mt-10 text-lg text-red-500">
        Please sign in to view your profile.
      </div>
    );
  }

  return (
    <>
      <div className="w-screen h-screen flex bg-gray-100 p-5">
        {/* Sidebar */}
        <div className="w-[25%] bg-white p-6 rounded-2xl shadow-md flex flex-col items-center">
          {/* Profile Image */}
          <div className="flex justify-center mb-4">
            <img
              src={user.imageUrl}
              alt="User Avatar"
              className="w-[250px] h-[250px] rounded-full border border-gray-300 shadow-inner"
            />
          </div>

          {/* User Details */}
          <div className="text-gray-700 w-full flex flex-col items-center text-center space-y-3 text-lg">
            {/* Username */}
            <div>
              <span className="font-semibold">Username:</span>{" "}
              {isEditing ? (
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  className="border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <span>{username}</span>
              )}
            </div>

            {/* Full Name */}
            <p>
              <span className="font-semibold">Full Name:</span> {user.fullName}
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
          <div className="w-[90%] border-t-2 border-gray-200 mt-6 mb-4"></div>

          {/* Buttons / Loading / Error */}
          <div className="w-full flex flex-col items-center">
            {loading && (
              <div className="text-center mt-2 text-lg text-gray-500">
                Updating profile...
              </div>
            )}
            {error && (
              <div className="text-center mt-2 text-lg text-red-500">
                {error}
              </div>
            )}
            {isEditing ? (
              <div className="mt-2 flex space-x-4">
                <button
                  onClick={handleUsernameSubmit}
                  className="bg-blue-500 text-white px-4 py-2 rounded-full"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-full mt-2"
              >
                Edit Username
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 ml-6 flex flex-col">
          {/* Top Row: Rating Tile + Chart Tile */}
          <div className="flex w-full gap-6 mb-6">
            {/* Rating Tile */}
            <div className="w-[250px] h-[250px] bg-white shadow-md rounded-2xl p-4 relative flex flex-col justify-center items-center">
              {/* Info Icon */}
              <div className="absolute top-3 right-3 text-gray-400">
                <i className="fas fa-info-circle"></i> {/* optional icon */}
              </div>

              {/* Heading */}
              <p className="text-lg font-semibold text-gray-500 mb-2">Rating</p>

              {/* Big Number */}
              <p className="text-5xl font-bold text-black">{userDetails.finalRating}</p>
            </div>

            {/* Chart Tile */}
            <div className="flex-1 bg-white shadow-md rounded-2xl p-4 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  Rating Progress
                </h2>
                <div className="text-gray-400 cursor-pointer">
                  <i className="fas fa-info-circle"></i> {/* optional icon */}
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[800, 1600]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#000"
                      strokeWidth={2}
                      dot={{ fill: "#000" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="w-full flex gap-10">
            {/* Codeforces Tile */}
            <div className="w-[450px] bg-white shadow-lg rounded-3xl p-8 flex flex-col items-center">
              <p className="text-3xl font-extrabold text-gray-800 mb-8">
                Codeforces
              </p>
              <div className="flex gap-8">
                {/* Rating Box */}
                <div className="bg-gray-100 p-8 rounded-2xl flex flex-col items-center w-[160px]">
                  <p className="text-lg font-semibold text-gray-500 mb-2">
                    Rating
                  </p>
                  <p className="text-4xl font-extrabold text-black">
                    {cf.rating}
                  </p>
                </div>
                {/* Rank Box */}
                <div className="bg-gray-100 p-8 rounded-2xl flex flex-col items-center w-[160px]">
                  <p className="text-lg font-semibold text-gray-500 mb-2">
                    Rank
                  </p>
                  <p className="text-4xl font-extrabold text-black">
                    {cf.rank}
                  </p>
                </div>
              </div>
            </div>

            {/* CodeChef Tile */}
            <div className="w-[450px] bg-white shadow-lg rounded-3xl p-8 flex flex-col items-center">
              <p className="text-3xl font-extrabold text-gray-800 mb-8">
                CodeChef
              </p>
              <div className="flex gap-8">
                {/* Rating Box */}
                <div className="bg-gray-100 p-8 rounded-2xl flex flex-col items-center w-[160px]">
                  <p className="text-lg font-semibold text-gray-500 mb-2">
                    Rating
                  </p>
                  <p className="text-4xl font-extrabold text-black">
                    {cf.rating}
                  </p>
                </div>
                {/* Rank Box */}
                <div className="bg-gray-100 p-8 rounded-2xl flex flex-col items-center w-[160px]">
                  <p className="text-lg font-semibold text-gray-500 mb-2">
                    Rank
                  </p>
                  <p className="text-4xl font-extrabold text-black">
                    {cf.rank}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* You can add more sections below if needed */}
        </div>
      </div>
    </>
  );
}
