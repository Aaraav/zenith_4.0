require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User');

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Zenith Coding Platform API');
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyASaYDYt5VNobHpcpsm3ngIUn1rD49UJgM");

// Queue for matchmaking
let waitingUsers = [];

// Helper to find a match
function findMatch(newUser) {
  return waitingUsers.find(
    u =>
      u.topic === newUser.topic &&
      Math.abs(u.averageRating - newUser.averageRating) <= 1 &&
      u.username !== newUser.username
  );
}

// Handle sockets
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join queue event
  socket.on("joinQueue", async ({ username, topic, averageRating }) => {
    console.log(`${username} joined queue on ${topic} [Rating: ${averageRating}]`);
    
    const newUser = { socketId: socket.id, username, topic, averageRating };
    const match = findMatch(newUser);

    if (match) {
      waitingUsers = waitingUsers.filter(u => u.username !== match.username);
      const roomId = `${match.username}_${newUser.username}_${Date.now()}`;

      socket.join(roomId);
      io.sockets.sockets.get(match.socketId)?.join(roomId);

      console.log(`✅ Room ${roomId} created between ${match.username} and ${newUser.username}`);

      io.to(roomId).emit("roomJoined", { 
        roomId, 
        users: [match.username, newUser.username] 
      });

      // Generate initial question
      const question = await generateQuestion(match.username, newUser.username, roomId);
      console.log("question",question);
      if (question) {
        io.to(roomId).emit("question-generated", question);
      }
    } else {
      waitingUsers.push(newUser);
    }
  });

//   Generate question manually
  socket.on("generate-question", async ({ user1, user2, room }) => {
    console.log(`Generating question for ${user1} and ${user2} in room ${room}`);
    const question = await generateQuestion(user1, user2, room);
    // console.log("question",question);
    io.to(room).emit("question-generated", question);

    if (question) {
        console.log("lll",question);
    }
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
  });
});

// Question generation logic
async function generateQuestion(user1, user2, room) {
  try {
    const [r1, r2] = await Promise.all([
      User.findOne({ username: user1 }),
      User.findOne({ username: user2 })
    ]);

    if (!r1 || !r2) {
      console.log("❌ One or both users not found");
      io.to(room).emit("questionError", { error: "User(s) not found." });
      return null;
    }

    const avgRating = (r1.rating + r2.rating) / 2;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // const userTopics = (r1.topics?.length ? r1.topics : r2.topics?.length ? r2.topics : ['Data Structures']);
    // const primaryTopic = userTopics[0] || 'Data Structures';

    const prompt = `Generate a competitive programming problem with these requirements:
- Difficulty suitable for programmers with average rating ${avgRating.toFixed(1)}
- Include problem statement with clear input/output requirements
- Provide 2 sample test cases with explanations
- Format similar to Codeforces/LeetCode problems
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // console.log("text",text);

    return {
      question: text,
      timestamp: new Date().toISOString(),
      roomId: room,
      users: [user1, user2]
    };

  } catch (err) {
    console.error("❌ Error generating question:", err);
    io.to(room).emit("questionError", { 
      error: "Failed to generate question. Please try again.",
      roomId: room
    });
    return null;
  }
}

// Start server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
