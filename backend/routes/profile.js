import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

// GET /profile
// Query: userId (optional, for now we'll use first user or create one)
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user impact for XP, level, etc.
    const impact = await UserImpact.findOne({ user_id: userId }) || {
      xp: 0,
      streak_days: 0,
      total_meals_logged: 0
    };

    // Calculate level from XP (100 XP per level)
    const level = Math.floor((impact.xp || 0) / 100) + 1;
    const xpInCurrentLevel = (impact.xp || 0) % 100;
    const xpToNextLevel = 100 - xpInCurrentLevel;

    // Map to iOS UserProfile format
    const profile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle: user.dietLevel || "vegan",
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Bud",
      level: level,
      xp: impact.xp || 0,
      xpToNextLevel: xpToNextLevel,
      coins: 0, // Not implemented yet
      streakDays: impact.streak_days || 0
    };

    res.json(profile);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// PATCH /profile
router.patch("/", async (req, res) => {
  try {
    const { id, userName, eatingStyle, dietaryRestrictions, cuisinePreferences, cookingStylePreferences, sproutName } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user fields
    if (userName !== undefined) user.name = userName;
    if (eatingStyle !== undefined) user.dietLevel = eatingStyle;
    if (dietaryRestrictions !== undefined) user.extraForbiddenTags = dietaryRestrictions;
    if (cuisinePreferences !== undefined) user.preferredCuisines = cuisinePreferences;
    if (cookingStylePreferences !== undefined) user.cookingStylePreferences = cookingStylePreferences;
    if (sproutName !== undefined) user.sproutName = sproutName;

    await user.save();

    // Get updated profile with impact data
    const impact = await UserImpact.findOne({ user_id: id }) || {
      xp: 0,
      streak_days: 0
    };

    const level = Math.floor((impact.xp || 0) / 100) + 1;
    const xpInCurrentLevel = (impact.xp || 0) % 100;
    const xpToNextLevel = 100 - xpInCurrentLevel;

    const profile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle: user.dietLevel || "vegan",
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Bud",
      level: level,
      xp: impact.xp || 0,
      xpToNextLevel: xpToNextLevel,
      coins: 0,
      streakDays: impact.streak_days || 0
    };

    res.json(profile);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /profile/parse-restrictions
router.post("/parse-restrictions", async (req, res) => {
  try {
    const { userId, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    // Simple parsing - extract common dietary restrictions from text
    const restrictions = [];
    const commonRestrictions = [
      "gluten", "dairy", "nuts", "peanuts", "soy", "eggs", 
      "fish", "shellfish", "sesame", "sulfites"
    ];

    const lowerText = text.toLowerCase();
    for (const restriction of commonRestrictions) {
      if (lowerText.includes(restriction)) {
        restrictions.push(restriction);
      }
    }

    res.json({ restrictions });
  } catch (err) {
    console.error("Parse restrictions error:", err);
    res.status(500).json({ error: "Failed to parse restrictions" });
  }
});

export default router;

