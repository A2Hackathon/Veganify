import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";
import { backendToSwiftDietLevel } from "../utils/eatingStyleMapper.js";

const router = express.Router();

// GET /home/summary?userId=...
router.get("/summary", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const impact = await UserImpact.findOne({ user_id: userId });

    if (!impact) {
      // Return default values if no impact found
      return res.json({
        profile: {
          id: user._id.toString(),
          userName: user.name || "User",
          eatingStyle: backendToSwiftDietLevel(user.dietLevel),
          dietaryRestrictions: user.extraForbiddenTags || [],
          cuisinePreferences: user.preferredCuisines || [],
          cookingStylePreferences: user.cookingStylePreferences || [],
          sproutName: user.sproutName || "Bud",
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          coins: 0,
          streakDays: 0
        },
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
        id: "log_meal",
        title: "Log a vegan meal",
        xpReward: 20,
        coinReward: 5,
        isCompleted: false
      },
      {
        id: "scan_ingredients",
        title: "Scan ingredients",
        xpReward: 10,
        coinReward: 3,
        isCompleted: false
      },
      {
        id: "try_recipe",
        title: "Try a new recipe",
        xpReward: 30,
        coinReward: 10,
        isCompleted: false
      }
    ];

    res.json({
      profile: {
        id: user._id.toString(),
        userName: user.name || "User",
        eatingStyle: backendToSwiftDietLevel(user.dietLevel),
        dietaryRestrictions: user.extraForbiddenTags || [],
        cuisinePreferences: user.preferredCuisines || [],
        cookingStylePreferences: user.cookingStylePreferences || [],
        sproutName: user.sproutName || "Bud",
        level: level,
        xp: impact.xp || 0,
        xpToNextLevel: xpToNextLevel,
        coins: 0,
        streakDays: impact.streak_days || 0
      },
      missions: missions
    });
  } catch (err) {
    console.error("Get home summary error:", err);
    res.status(500).json({ error: "Failed to get home summary" });
  }
});

export default router;
