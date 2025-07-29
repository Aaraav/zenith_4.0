const BattleHistory=require("./models/battleHistory");



app.get("/api/battles/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const battles = await BattleHistory.find({
      "users.username": username,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Decompress data for response
    const decompressedBattles = battles.map((battle) =>
      battle.getDecompressedData()
    );

    res.json({
      success: true,
      battles: decompressedBattles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await BattleHistory.countDocuments({
          "users.username": username,
        }),
      },
    });
  } catch (error) {
    console.error("Error fetching user battles:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch battle history" });
  }
});

// Get recent battles (for leaderboard/analytics)
app.get("/api/battles/recent", async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const battles = await BattleHistory.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select(
        "roomId users.username users.finalRating users.ratingChange createdAt battleDuration"
      );

    res.json({
      success: true,
      battles,
    });
  } catch (error) {
    console.error("Error fetching recent battles:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch recent battles" });
  }
});

// Get battle statistics
app.get("/api/battles/stats/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const stats = await BattleHistory.aggregate([
      { $match: { "users.username": username } },
      { $unwind: "$users" },
      { $match: { "users.username": username } },
      {
        $group: {
          _id: null,
          totalBattles: { $sum: 1 },
          totalRatingGained: { $sum: "$users.ratingChange" },
          averageRatingChange: { $avg: "$users.ratingChange" },
          wins: {
            $sum: { $cond: [{ $gt: ["$users.ratingChange", 15] }, 1, 0] },
          },
          maxRatingGain: { $max: "$users.ratingChange" },
          currentRating: { $last: "$users.finalRating" },
        },
      },
    ]);

    const userStats = stats[0] || {
      totalBattles: 0,
      totalRatingGained: 0,
      averageRatingChange: 0,
      wins: 0,
      maxRatingGain: 0,
      currentRating: 1000,
    };

    res.json({
      success: true,
      stats: {
        ...userStats,
        winRate:
          userStats.totalBattles > 0
            ? ((userStats.wins / userStats.totalBattles) * 100).toFixed(1)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch battle statistics" });
  }
});

// 🧪 TEST ENDPOINT (Remove in production)
app.get("/api/battles/test-compression", async (req, res) => {
  try {
    const sampleQuestion = `
        <div>
            <h2>Two Sum Problem</h2>
            <p>Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.</p>
            <h3>Input:</h3>
            <p>nums = [2,7,11,15], target = 9</p>
            <h3>Output:</h3>
            <p>[0,1]</p>
            <h3>Explanation:</h3>
            <p>Because nums[0] + nums[1] == 9, we return [0, 1].</p>
        </div>`;

    const originalSize = Buffer.byteLength(sampleQuestion, "utf8");
    const compressed = BattleHistory.compressData(sampleQuestion);
    const compressedSize = Buffer.byteLength(compressed, "utf8");
    const decompressed = BattleHistory.decompressData(compressed);

    res.json({
      success: true,
      test: {
        originalSize,
        compressedSize,
        compressionRatio: `${(
          (1 - compressedSize / originalSize) *
          100
        ).toFixed(1)}%`,
        dataIntegrity:
          sampleQuestion === decompressed ? "✅ Perfect" : "❌ Failed",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});