const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User');
const Rating = require('./models/rating');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

// MongoDB Connection
mongoose.connect("mongodb+srv://aaraav2810:aaraav2810@zenith.mzeyjhr.mongodb.net/zenith", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Express and HTTP Server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyASaYDYt5VNobHpcpsm3ngIUn1rD49UJgM");

// POST: Generate Question for Two Users
app.post("/generate-question", async (req, res) => {
  const { user1, user2 } = req.body;

  try {
    const r1 = await User.findOne({ username: user1 });
    const r2 = await User.findOne({ username: user2 });

    if (!r1 || !r2) return res.status(404).json({ error: "One or both users not found." });

    const avgRating = (Math.max(parseFloat(r1.rating) || 1000, 1000) + Math.max(parseFloat(r2.rating) || 1000, 1000)) / 2;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Generate an interesting competitive programming or DSA question suitable for users with an average rating of ${avgRating}. 
      The question should include two sample test cases. Only output the question with no additional explanations or code. 
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const questions = text
      .split('\n')
      .filter(line => line.trim())
      .map(q => q.replace(/^\d+[\).\s]*/, ''));

    res.json({ questions });
  } catch (err) {
    console.error('❌ Error generating question:', err);
    res.status(500).json({ error: "Failed to generate question." });
  }
});

// POST: Evaluate Code
// POST: Evaluate Code for two users
app.post('/evaluate-code', async (req, res) => {
  // Expect two code snippets, one for each user
  const { code1, code2, roomId, user1, user2, questions } = req.body;

  // Basic validation
  if (!code1 || !code2) {
    return res.status(400).json({ error: 'Two code submissions are required for evaluation.' });
  }

  try {
    // This is the new, more robust prompt for the AI
    const prompt = `
      You are an expert programming contest judge. You will be given a programming problem and two different code submissions from two different users who are competing against each other.

      The programming problem is:
      ${questions}

      ---
      Submission from User 1 (${user1}):
      \`\`\`
      ${code1}
      \`\`\`
      ---
      Submission from User 2 (${user2}):
      \`\`\`
      ${code2}
      \`\`\`
      ---

      Your task is to:
      1. Evaluate EACH submission INDEPENDENTLY based on correctness, optimization, code quality, time complexity, and space complexity.
      2. Provide a brief, separate analysis for each user's code.
      3. Provide a separate numerical rating increment for each user. The increment should be fair, like in a real coding platform (e.g., between 0 and 30 points). A correct and optimal solution gets a higher increment than a correct but unoptimized one. An incorrect or non-functional solution gets 0.

      Format your entire output EXACTLY like this, with no extra text before or after:

      User 1 Analysis: [Your detailed analysis for User 1's code here]
      User 2 Analysis: [Your detailed analysis for User 2's code here]
      User 1 Rating Increment: [A single number for User 1]
      User 2 Rating Increment: [A single number for User 2]
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using a more capable model for complex instructions

    const result = await model.generateContent(prompt);
    const aiEvaluation = result.response.text();

    console.log("AI Evaluation Result:\n", aiEvaluation);

    // Use more robust regex to parse the structured output
    const user1Analysis = aiEvaluation.match(/User 1 Analysis: ([\s\S]*?)User 2 Analysis:/)?.[1]?.trim() || "No analysis provided.";
    const user2Analysis = aiEvaluation.match(/User 2 Analysis: ([\s\S]*?)User 1 Rating Increment:/)?.[1]?.trim() || "No analysis provided.";
    const user1Increment = parseInt(aiEvaluation.match(/User 1 Rating Increment: (\d+)/)?.[1] || 0, 10);
    const user2Increment = parseInt(aiEvaluation.match(/User 2 Rating Increment: (\d+)/)?.[1] || 0, 10);

    const r1 = await User.findOne({ username: user1 });
    const r2 = await User.findOne({ username: user2 });

    if (!r1 || !r2) return res.status(404).json({ error: "One or both users not found." });

    // Helper function to cap ratings
    const capRating = (rating) => Math.min(rating, 3000);

    const user1NewRating = capRating((r1.rating || 1000) + user1Increment);
    const user2NewRating = capRating((r2.rating || 1000) + user2Increment);
    
    // Update user ratings in the User collection
    await User.findByIdAndUpdate(r1._id, { rating: user1NewRating });
    await User.findByIdAndUpdate(r2._id, { rating: user2NewRating });

    console.log(`✅ Ratings updated: ${user1} -> ${user1NewRating}, ${user2} -> ${user2NewRating}`);

    res.json({
      message: 'Code evaluated successfully',
      user1: { newRating: user1NewRating, increment: user1Increment, analysis: user1Analysis },
      user2: { newRating: user2NewRating, increment: user2Increment, analysis: user2Analysis },
    });

  } catch (err) {
    console.error('❌ Error evaluating code:', err);
    res.status(500).json({ error: 'Failed to evaluate and save ratings' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
