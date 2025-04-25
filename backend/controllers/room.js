module.exports = function(io) {
    return async function generateQuestions(req, res) {
      const { user1, user2 } = req.body;
  
      const r1 = await User.findOne({ username: user1 });
      const r2 = await User.findOne({ username: user2 });
  
      if (!r1 || !r2) return res.status(404).json({ error: "One or both users not found." });
  
      const avgRating = (r1.rating + r2.rating) / 2;
  
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
        const prompt = `Generate 5 interesting and engaging questions of CP or DSA from Codeforces or LeetCode with two test cases visible. Make them suitable for users with an average rating of ${avgRating}.`;
  
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const questions = text
          .split('\n')
          .filter(q => q.trim())
          .map(q => q.replace(/^\d+[\).\s]*/, ''));
  
        // Send to both users using Socket.IO
        io.to(user1).emit("receiveQuestions", { questions });
        io.to(user2).emit("receiveQuestions", { questions });
  
        res.json({ success: true, questions });
      } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: "Failed to generate questions." });
      }
    }
  };
  