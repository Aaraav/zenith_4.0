import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

export default function Profile() {
  const { isSignedIn, user } = useUser();
  const [username, setUsername] = useState("");
  const [isUserSaved, setIsUserSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save user data to localStorage if not already saved
  useEffect(() => {
    const saveUserData = async () => {
      if (!user || isUserSaved) return;

      try {
        const userData = {
          clerkId: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
        };

        localStorage.setItem("clerkId", user.id);
        localStorage.setItem("userData", JSON.stringify(userData));

        const response = await axios.post(
          "http://localhost:4000/api/users/save-user",
          userData
        );
        if (response.data.success) {
          setIsUserSaved(true);
          setUsername(user.username);
        }
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    };

    if (isSignedIn) {
      saveUserData();
    }
  }, [isSignedIn, user, isUserSaved]);

  // Fetch updated user data using clerkId from localStorage
  const fetchUpdatedUserData = async () => {
    const storedClerkId = localStorage.getItem("clerkId");
    if (!storedClerkId) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:4000/api/users/getUser/${localStorage.getItem(
          "clerkId"
        )}`
      );
      if (response.data.success) {
        setUsername(response.data.user.username);
      }
    } catch (err) {
      setError("Error fetching updated user data");
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load username from localStorage on initial render
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      setUsername(parsedData.username);
    }
  }, []);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handleUsernameSubmit = async () => {
    const storedUserData = localStorage.getItem("userData");
    if (!storedUserData) return;

    const parsedUser = JSON.parse(storedUserData);
    const updatedData = { ...parsedUser, username };
    console.log(updatedData);
    try {
      const response = await axios.put(
        "http://localhost:4000/api/users/update-username",
        updatedData
      );
      if (response.data.success) {
        localStorage.setItem("userData", JSON.stringify(updatedData)); // update localStorage
        fetchUpdatedUserData();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating username:", error);
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
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        👤 Profile
      </h1>
      <div className="flex justify-center mb-4">
        <img
          src={user.imageUrl}
          alt="User Avatar"
          className="w-24 h-24 rounded-full border border-gray-300"
        />
      </div>

      <div className="text-gray-700 space-y-3 text-lg">
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
        <p>
          <span className="font-semibold">Full Name:</span> {user.fullName}
        </p>
        <p>
          <span className="font-semibold">Email:</span>{" "}
          {user.primaryEmailAddress?.emailAddress}
        </p>
        <p>
          <span className="font-semibold">Created At:</span>{" "}
          {new Date(user.createdAt).toLocaleString()}
        </p>
      </div>

      {loading && (
        <div className="text-center mt-4 text-lg text-gray-500">
          Updating profile...
        </div>
      )}

      {error && (
        <div className="text-center mt-4 text-lg text-red-500">{error}</div>
      )}

      {isEditing ? (
        <div className="mt-4 text-center">
          <button
            onClick={handleUsernameSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded-full"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-full"
          >
            Edit Username
          </button>
        </div>
      )}
    </div>
  );
}
