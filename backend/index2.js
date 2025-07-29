const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User');
const BattleHistory = require('./models/battleHistory');

dotenv.config();

// --- DATABASE & SERVER SETUP ---
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith")
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
const PORT =  5000;

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('Zenith Coding Platform API is running...'));

// --- AI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyASaYDYt5VNobHpcpsm3ngIUn1rD49UJgM");

// --- IN-MEMORY STORES ---
const rooms = {}; // For active coding rooms
let waitingUsers = []; // For matchmaking queue

// --- HELPER FUNCTION FOR AI EVALUATION ---
async function performEvaluation(roomId) {
    const room = rooms[roomId];
    if (!room || !room.users[room.user1]?.code || !room.users[room.user2]?.code) {
        io.to(roomId).emit("evaluationError", { message: "Could not perform evaluation. Code missing." });
        return;
    }

    const { user1, user2, question } = room;
    const code1 = room.users[user1].code;
    const code2 = room.users[user2].code;

    try {
        // FIX: Updated the prompt to be stricter and more like a competitive programming platform.
        const prompt = `
          You are a strict, automated judge for a competitive programming platform like LeetCode or Codeforces. Your task is to evaluate two code submissions for a given problem and award rating points based on performance and correctness.

          **Problem Statement:**
          ${question}

          ---
          **Submission from User 1 (${user1}):**
          \`\`\`
          ${code1}
          \`\`\`
          ---
          **Submission from User 2 (${user2}):**
          \`\`\`
          ${code2}
          \`\`\`
          ---

          **Evaluation Criteria (Apply to EACH user INDEPENDENTLY):**

          1.  **Correctness (Most Important):** Does the code produce the correct output for all inputs, including edge cases described in the problem? If a solution is logically flawed or fails the sample test cases, it must receive a rating increment of 0.
          2.  **Time & Space Complexity:** Is the solution efficient? An optimal solution (e.g., O(n)) is far superior to a brute-force one (e.g., O(n^2)).
          3.  **Code Quality:** Is the code clean, readable, and well-structured? This is a minor factor compared to correctness and efficiency.

          **Rating Increment Rules:**
          - **Correct & Optimal Solution:** Award a high increment (20-30 points).
          - **Correct but Suboptimal (e.g., poor time complexity):** Award a medium increment (10-19 points).
          - **Incorrect, Fails Samples, or Doesn't Compile:** Award an increment of **0 points**. No points for incorrect solutions.

          **Your Task:**
          Provide a brief analysis for each user, then provide their rating increment.

          **Output Format (Strictly follow this format with no extra text):**
          User 1 Analysis: [Your brief analysis for User 1's code based on the criteria.]
          User 2 Analysis: [Your brief analysis for User 2's code based on the criteria.]
          User 1 Rating Increment: [A single number for User 1, following the rules.]
          User 2 Rating Increment: [A single number for User 2, following the rules.]
        `;
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const aiEvaluation = result.response.text();

        const user1Analysis = aiEvaluation.match(/User 1 Analysis:([\s\S]*?)User 2 Analysis:/)?.[1]?.trim() || "No analysis provided.";
        const user2Analysis = aiEvaluation.match(/User 2 Analysis:([\s\S]*?)User 1 Rating Increment:/)?.[1]?.trim() || "No analysis provided.";
        const user1Increment = parseInt(aiEvaluation.match(/User 1 Rating Increment: (\d+)/)?.[1] || 0, 10);
        const user2Increment = parseInt(aiEvaluation.match(/User 2 Rating Increment: (\d+)/)?.[1] || 0, 10);

        const r1 = await User.findOne({ username: user1 });
        const r2 = await User.findOne({ username: user2 });

        const user1NewRating = (r1.finalRating || 1000) + user1Increment;
        const user2NewRating = (r2.finalRating || 1000) + user2Increment;

        await User.findByIdAndUpdate(r1._id, { finalRating: user1NewRating });
        await User.findByIdAndUpdate(r2._id, { finalRating: user2NewRating });

        const resultsPayload = {
            user1: { username: user1, newRating: user1NewRating, increment: user1Increment, analysis: user1Analysis },
            user2: { username: user2, newRating: user2NewRating, increment: user2Increment, analysis: user2Analysis },
        };

        io.to(roomId).emit("evaluationComplete", resultsPayload);
          storeBattleHistory(
      roomId,
      room,
      resultsPayload,
      r1.finalRating,
      r2.finalRating
    ).catch((err) => {
      console.error("⚠️ Battle history storage failed (non-critical):", err);
    });
        delete rooms[roomId];

    } catch (error) {
        console.error("Evaluation Error:", error);
        io.to(roomId).emit("evaluationError", { message: "An error occurred during AI evaluation." });
    }
}

 async function storeBattleHistory(
  roomId,
  room,
  resultsPayload,
  user1OldRating,
  user2OldRating
) {
  try {
    const battleData = {
      roomId,

      // Compressed question (60% size reduction)
      question: BattleHistory.compressData(room.question),
      questionCompressed: true,

      // User data with compressed code
      users: [
        {
          username: room.user1,
          code: BattleHistory.compressData(room.users[room.user1].code),
          codeCompressed: true,
          finalRating: resultsPayload.user1.newRating,
          ratingChange: resultsPayload.user1.increment,
          analysis: resultsPayload.user1.analysis,
        },
        {
          username: room.user2,
          code: BattleHistory.compressData(room.users[room.user2].code),
          codeCompressed: true,
          finalRating: resultsPayload.user2.newRating,
          ratingChange: resultsPayload.user2.increment,
          analysis: resultsPayload.user2.analysis,
        },
      ],

      // Battle metadata
      topic: room.topic || "DSA",
      averageRating: Math.round(
        ((user1OldRating || 1000) + (user2OldRating || 1000)) / 2
      ),
      battleStarted: room.createdAt || new Date(Date.now() - 600000),
      battleEnded: new Date(),
      battleDuration: room.createdAt
        ? Math.round((Date.now() - room.createdAt.getTime()) / 1000)
        : 600,
    };

    await BattleHistory.create(battleData);
    console.log(`✅ Battle history stored for room: ${roomId}`);
  } catch (error) {
    console.error(
      `❌ Failed to store battle history for room ${roomId}:`,
      error
    );
    // Don't throw - this shouldn't affect user experience
  }
}

// --- HELPER FUNCTION FOR QUESTION GENERATION ---
async function generateQuestion(user1, user2, room) {
    try {
        const [r1, r2] = await Promise.all([ User.findOne({ username: user1 }), User.findOne({ username: user2 }) ]);
        if (!r1 || !r2) {
            io.to(room).emit("questionError", { error: "User(s) not found." });
            return null;
        }
        
        const avgRating = (r1.finalRating + r2.finalRating) / 2;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Generate a competitive programming problem as a self-contained HTML block. Requirements: - Difficulty suitable for programmers with an average rating of ${avgRating.toFixed(1)}. - The entire output MUST be only the HTML code. Do NOT include markdown fences (\`\`\`html) or any other text. - Include a problem statement, input/output requirements, and 2 sample test cases with explanations. - Format similar to a Codeforces/LeetCode problem.`;
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();
        
        const htmlMatch = rawText.match(/```html([\s\S]*?)```/);
        const extractedHtml = htmlMatch ? htmlMatch[1].trim() : rawText;
        
        if (rooms[room]) {
            rooms[room].question = extractedHtml;
        }

        return { question: extractedHtml, timestamp: new Date().toISOString(), roomId: room, users: [user1, user2] };
    } catch (err) {
        console.error("❌ Error generating question:", err);
        io.to(room).emit("questionError", { error: "Failed to generate question. Please try again." });
        return null;
    }
}

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // Matchmaking Logic
    socket.on("joinQueue", async ({ username, topic, averageRating }) => {
        const findMatch = (newUser) => waitingUsers.find(u => u.topic === newUser.topic && Math.abs(u.averageRating - newUser.averageRating) <= 150 && u.username !== newUser.username);
        const newUser = { socketId: socket.id, username, topic, averageRating };
        const match = findMatch(newUser);

        if (match) {
            waitingUsers = waitingUsers.filter(u => u.socketId !== match.socketId);
            const user1 = match.username;
            const user2 = newUser.username;
            const roomId = `${user1}_${user2}_${Date.now()}`;

            rooms[roomId] = {
                user1, user2, question: null,
                users: {
                    [user1]: { socketId: match.socketId, code: `// ${user1}'s code`, hasSubmitted: false },
                    [user2]: { socketId: newUser.socketId, code: `// ${user2}'s code`, hasSubmitted: false }
                }
            };
            
            io.sockets.sockets.get(match.socketId)?.join(roomId);
            socket.join(roomId);
            
            console.log(`✅ Match found! Room ${roomId} created for ${user1} and ${user2}`);
            io.to(roomId).emit("roomJoined", { roomId, users: [user1, user2] });

            const question = await generateQuestion(user1, user2, roomId);
            if (question) {
                io.to(roomId).emit("question-generated", question);
            }
        } else {
            waitingUsers.push(newUser);
        }
    });

    socket.on("joinRoom", ({ roomId, username }) => {
        if (rooms[roomId] && rooms[roomId].users[username]) {
            socket.join(roomId);
            rooms[roomId].users[username].socketId = socket.id;
            console.log(`User ${username} re-synced in room ${roomId} with socket ${socket.id}`);
        }
    });

    // In-Game Logic
    socket.on("codeChange", ({ roomId, username, code }) => {
        if (rooms[roomId]?.users[username]) {
            rooms[roomId].users[username].code = code;
            socket.to(roomId).emit("opponentCodeChange", { code });
        }
    });

    socket.on("submitCode", ({ roomId, username }) => {
        const room = rooms[roomId];
        if (room?.users[username] && !room.users[username].hasSubmitted) {
            room.users[username].hasSubmitted = true;
            console.log(`User ${username} submitted code in room ${roomId}`);
            
            const opponent = username === room.user1 ? room.user2 : room.user1;
            socket.to(roomId).emit("opponentSubmitted", { username });

            if (room.users[opponent]?.hasSubmitted) {
                console.log(`Both users submitted in ${roomId}. Starting evaluation.`);
                io.to(roomId).emit("statusUpdate", { message: "Both users have submitted. Evaluating..." });
                performEvaluation(roomId);
            } else {
                io.to(roomId).emit("statusUpdate", { message: `Waiting for ${opponent} to submit...` });
            }
        }
    });

    // Disconnect Logic
    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const disconnectedUser = Object.keys(room.users).find(u => room.users[u].socketId === socket.id);
            if(disconnectedUser) {
                io.to(roomId).emit("opponentDisconnected", { message: `${disconnectedUser} has disconnected.` });
                delete rooms[roomId];
                console.log(`Cleaned up room ${roomId} due to disconnect.`);
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
