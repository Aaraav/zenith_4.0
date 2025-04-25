const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User'); // Make sure this path is correct

dotenv.config();

// DB connection
mongoose.connect("mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith");

// Setup Express and HTTP Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});
const PORT =4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/userRoutes.js');
app.use('/api/users', userRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Register sockets
// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   socket.on("register", (username) => {
//     console.log(`${username} joined their room`);
//     socket.join(username); // Join a room named after the username
//   });

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

// Gemini AI Setup
const genAI = new GoogleGenerativeAI("AIzaSyASaYDYt5VNobHpcpsm3ngIUn1rD49UJgM");

// POST: Generate Questions for Two Users
app.post("/generate-question", async (req, res) => {
  const { user1, user2 } = req.body;

  try {
    const r1 = await User.findOne({ username: user1 });
    const r2 = await User.findOne({ username: user2 });

    if (!r1 || !r2) return res.status(404).json({ error: "One or both users not found." });

    const avgRating = (r1.rating + r2.rating) / 2;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Generate an interesting competitive programming or DSA question suitable for users with an average rating of ${avgRating}. The question should include two sample test cases, and only the question should be provided with no additional explanations or code.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const questions = text
      .split('\n')
      .filter(line => line.trim())
      .map(q => q.replace(/^\d+[\).\s]*/, ''));

    // Send questions to both users via Socket.IO
    // io.to(user1).emit("receiveQuestions", { questions });
    // io.to(user2).emit("receiveQuestions", { questions });

    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate questions." });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
