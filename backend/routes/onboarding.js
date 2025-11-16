import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

// POST /onboarding/profile
router.post("/profile", async (req, res) => {
  try {
    const { eatingStyle, dietaryRestrictions, cuisinePreferences, cookingStylePreferences, sproutName } = req.body;

    if (!eatingStyle) {
      return res.status(400).json({ error: "eatingStyle is required" });
    }

    // Create new user
    const user = await User.create({
      name: "User",
      dietLevel: eatingStyle,
      extraForbiddenTags: dietaryRestrictions || [],
      preferredCuisines: cuisinePreferences || [],
      cookingStylePreferences: cookingStylePreferences || [],
      sproutName: sproutName || "Bud"
    });

    // Create initial UserImpact
    await UserImpact.create({
      user_id: user._id,
      xp: 0,
      total_meals_logged: 0,
      streak: 0,
      streak_days: 0,
      forest_stage: "SEED",
      last_activity_date: null
    });

    // Return profile in iOS format
    const profile = {
      id: user._id.toString(),
      userName: "User",
      eatingStyle: user.dietLevel,
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: cookingStylePreferences || [],
      sproutName: sproutName || "Bud",
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      coins: 0,
      streakDays: 0
    };

    res.json(profile);
  } catch (err) {
    console.error("Create profile error:", err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

export default router;

