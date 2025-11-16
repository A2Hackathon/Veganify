import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

// POST /progress/complete-mission
router.post("/complete-mission", async (req, res) => {
  try {
    const { userId, missionId } = req.body;

    if (!userId || !missionId) {
      return res.status(400).json({ error: "userId and missionId are required" });
    }

    // Find or create UserImpact
    let impact = await UserImpact.findOne({ user_id: userId });
    
    if (!impact) {
      impact = await UserImpact.create({
        user_id: userId,
        xp: 0,
        total_meals_logged: 0,
        streak: 0,
        streak_days: 0,
        forest_stage: "SEED",
        last_activity_date: null
      });
    }

    // Award XP based on mission (simplified - can be enhanced)
    const xpRewards = {
      "1": 10, // Log a meal
      "2": 5,  // Scan ingredients
      "3": 15  // Try a new recipe
    };

    const xpAward = xpRewards[missionId] || 5;
    impact.xp += xpAward;

    // Update forest stage based on XP
    if (impact.xp < 50) impact.forest_stage = "SEED";
    else if (impact.xp < 200) impact.forest_stage = "SPROUT";
    else if (impact.xp < 500) impact.forest_stage = "SAPLING";
    else if (impact.xp < 1500) impact.forest_stage = "FOREST";
    else impact.forest_stage = "ANCIENT_FOREST";

    await impact.save();

    // Get user for profile response
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate level
    const level = Math.floor(impact.xp / 100) + 1;
    const xpInCurrentLevel = impact.xp % 100;
    const xpToNextLevel = 100 - xpInCurrentLevel;

    // Return updated profile
    const profile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle: user.dietLevel || "vegan",
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: [],
      sproutName: "Bud",
      level: level,
      xp: impact.xp,
      xpToNextLevel: xpToNextLevel,
      coins: 0,
      streakDays: impact.streak_days || 0
    };

    res.json(profile);
  } catch (err) {
    console.error("Complete mission error:", err);
    res.status(500).json({ error: "Failed to complete mission" });
  }
});

export default router;

