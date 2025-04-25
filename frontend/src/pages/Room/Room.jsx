import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
// import io from "socket.io-client";

// const socket = io("http://localhost:5000"); // Update this if deployed

const Room = () => {
  const { roomId } = useParams();
  const containerRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState("");
  const [user1, setUser1] = useState("guest");
  const [user2, setUser2] = useState("guest");

  // Set user1, user2, and room name
  useEffect(() => {
    const [u1, u2] = roomId.split("_");
    setUser1(u1);
    setUser2(u2);
    setRoom(roomId);
    console.log("✅ Room and users set:", { roomId, u1, u2 });
  }, [roomId]);

  // Zego Video Call Setup
  useEffect(() => {
    const initCall = async () => {
      const appId = 1031906663;
      const serverSecret = "9c0f1d8070d5b1618e92ab75c0ffe41a";

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        Date.now().toString(),
        "aaraav"
      );

      const zc = ZegoUIKitPrebuilt.create(kitToken);

      zc.joinRoom({
        container: containerRef.current,
        sharedLinks: [
          {
            name: "Copy Link",
            url: `${window.location.origin}/room/${room}`,
          },
        ],
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
      });
    };

    initCall();
  }, [roomId]);

  // Generate question and send POST request to backend
//   const generateQuestion = async () => {
//     console.log("🚀 Generating question for:", { user1, user2, room });
//     setLoading(true);

//     // Send a POST request to the backend to generate a question
//     try {
//       const response = await fetch("http://localhost:4000/generate-question", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ user1, user2 }),
//       });

//       const data = await response.json();
//       console.log("📥 Received question from server:", data);

//       // Update the questions state with the response data
//       if (data && data.questions) {
//         setQuestions(data.questions);
//       } else {
//         setQuestions(["❌ Failed to generate questions."]);
//       }

//     } catch (error) {
//       console.error("❌ Error generating question:", error);
//       setQuestions(["❌ Failed to generate questions."]);
//     }

//     setLoading(false);
//   };

  return (
    <div className="relative w-screen h-screen flex">
      {/* Video Call Section */}
      <div ref={containerRef} className="w-[50vw] h-full" />

      {/* Right Panel */}
      <div className="w-[50vw] p-6 bg-gray-100 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">AI CP/DSA Questions</h2>

        <button
          onClick={generateQuestion}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Questions"}
        </button>

        <ul className="space-y-4">
          {questions.map((question, index) => (
            <li key={index} className="bg-white p-3 rounded shadow">
              {question}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Room;
