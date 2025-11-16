import express from "express";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

// GET /home/summary
// Query: userId (optional)
router.get("/summary", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const impact = await UserImpact.findOne({ user_id: userId });

    if (!impact) {
      // Return default values if no impact found
      return res.json({
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        coins: 0,
        streakDays: 0,
        missions: []
      });
    }

    // Calculate level from XP
    const level = Math.floor((impact.xp || 0) / 100) + 1;
    const xpInCurrentLevel = (impact.xp || 0) % 100;
    const xpToNextLevel = 100 - xpInCurrentLevel;

    // Generate daily missions (simplified - can be enhanced later)
    const missions = [
      {
        id: "1",
        title: "Log a meal",
        description: "Log what you ate today",
        xpReward: 10,
        isCompleted: false
      },
      {
        id: "2",
        title: "Scan ingredients",
        description: "Scan ingredients from a product",
        xpReward: 5,
        isCompleted: false
      },
      {
        id: "3",
        title: "Try a new recipe",
        description: "Generate or veganize a recipe",
        xpReward: 15,
        isCompleted: false
      }
    ];

    res.json({
      level: level,
      xp: impact.xp || 0,
      xpToNextLevel: xpToNextLevel,
      coins: 0, // Not implemented yet
      streakDays: impact.streak_days || 0,
      missions: missions
    });
  } catch (err) {
    console.error("Get home summary error:", err);
    res.status(500).json({ error: "Failed to get home summary" });
  }
});

export default router;

