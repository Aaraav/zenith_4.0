const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User');

dotenv.config();

// MongoDB connection
mongoose.connect("mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith");
  

// Setup Express & HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

const PORT = 5000;
app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Test API
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Google Gemini AI"
const genAI = new GoogleGenerativeAI("AIzaSyASaYDYt5VNobHpcpsm3ngIUn1rD49UJgM");

// Matchmaking logic
let waitingUsers = [];

function findMatch(newUser) {
  return waitingUsers.find(
    u =>
      u.topic === newUser.topic &&
      Math.abs(u.averageRating - newUser.averageRating) <= 1 &&
      u.username !== newUser.username
  );
}

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Matchmaking
  socket.on("joinQueue", ({ username, topic, averageRating }) => {
    console.log(`${username} joined queue on ${topic} [Rating: ${averageRating}]`);
    
    const newUser = { socketId: socket.id, username, topic, averageRating };
    const match = findMatch(newUser);

    if (match) {
      waitingUsers = waitingUsers.filter(u => u.username !== match.username);

      const roomId = `${match.username}_${newUser.username}_${Math.floor(100000 + Math.random() * 900000)}`;
      socket.join(roomId);
      io.sockets.sockets.get(match.socketId)?.join(roomId);

      console.log(`✅ Room ${roomId} created between ${match.username} and ${newUser.username}`);

      io.to(roomId).emit("roomJoined", { roomId, users: [match.username, newUser.username] });

      // Auto-generate question for matched users
      generateQuestion(match.username, newUser.username, roomId);
    } else {
      waitingUsers.push(newUser);
    }
  });

  // Manually trigger question generation
//   socket.on("generate-question", async ({ user1, user2, room }) => {
//     await generateQuestion(user1, user2, room);
//   });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
  });
});

// Generate AI-based questions
async function generateQuestion(user1, user2, room) {
    try {
      const r1 = await User.findOne({ username: user1 });
      const r2 = await User.findOne({ username: user2 });
  
      if (!r1 || !r2) {
        console.log("❌ One or both users not found");
        io.to(room).emit("questionError", { error: "User(s) not found." });
        return;
      }
  
      const avgRating = (r1.rating + r2.rating) / 2;
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
      const prompt = `Generate a competitive programming or DSA problem similar to Codeforces/LeetCode, with 2 sample test cases, suitable for average rating ${avgRating}.`;
  
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
  
      io.to(room).emit("question-response", { question: text });
      console.log(`📤 Sent question to room: ${room}`);
  
    } catch (err) {
      console.error("❌ Error generating question:", err);
      io.to(room).emit("questionError", { error: "Failed to generate questions." });
    }
  }
  
// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
