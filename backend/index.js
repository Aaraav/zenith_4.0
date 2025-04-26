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
app.post('/evaluate-code', async (req, res) => {
  const { code, roomId, user1, user2, questions } = req.body;

  try {
    const prompt = `
      Evaluate the following code based on the solution's optimization, code quality, time complexity, and space complexity based on this cp ${questions}. 
      Provide a detailed rating for the code.

      Code:
      ${code}

      Please provide a numerical increment that can be added to the user's rating and it should be relatable like in a coding platform (no more than 30 points at a time).
      Format the output as:
      "User 1 Rating Increment: <value>"
      "User 2 Rating Increment: <value>"
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const aiEvaluation = result.response.text();

    console.log("aiEvaluation", aiEvaluation);

    const user1Increment = parseInt(aiEvaluation.match(/User 1 Rating Increment: (\d+)/)?.[1] || 0, 10);
    const user2Increment = parseInt(aiEvaluation.match(/User 2 Rating Increment: (\d+)/)?.[1] || 0, 10);

    const r1 = await User.findOne({ username: user1 });
    const r2 = await User.findOne({ username: user2 });

    if (!r1 || !r2) return res.status(404).json({ error: "One or both users not found." });

    // Helper function to cap ratings
    const capRating = (rating) => Math.min(rating, 3000);

    const user1NewRating = capRating((r1.rating || 1000) + user1Increment);
    const user2NewRating = capRating((r2.rating || 1000) + user2Increment);

    const rating1 = new Rating({
      value: user1NewRating,
      comment: aiEvaluation,
      targetId: r1._id,
    });

    const rating2 = new Rating({
      value: user2NewRating,
      comment: aiEvaluation,
      targetId: r2._id,
    });

    await rating1.save();
    await rating2.save();

    const updatedUser1 = await User.findByIdAndUpdate(
      r1._id, // Finding the user by their _id
      { $set: { finalRating: user1NewRating } }, // Setting the finalRating field to user1NewRating
      { new: true } // Ensures the updated document is returned
    );
    
    const updatedUser2 = await User.findByIdAndUpdate(
      r2._id, // Finding the second user by their _id
      { $set: { finalRating: user2NewRating } }, // Setting the finalRating field to user2NewRating
      { new: true } // Ensures the updated document is returned
    );
    
    console.log("✅ Updated user ratings:", updatedUser1, updatedUser2);
    
    

    
    

    res.json({
      message: 'Code evaluated successfully',
      user1: { newRating: user1NewRating },
      user2: { newRating: user2NewRating },
      evaluation: aiEvaluation,
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
