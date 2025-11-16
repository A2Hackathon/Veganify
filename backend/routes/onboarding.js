import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

// helper: map EatingStyle display string → backend code
function eatingStyleToDietLevel(eatingStyle) {
  if (!eatingStyle) return "flexitarian";
  const val = eatingStyle.toLowerCase();
  if (val.includes("vegan")) return "vegan";
  if (val.includes("ovo-vegetarian")) return "ovo";
  if (val.includes("lacto-ovo")) return "lacto_ovo";
  if (val.includes("lacto-vegetarian")) return "lacto";
  if (val.includes("pescatarian")) return "pescatarian";
  if (val.includes("vegetarian")) return "vegetarian";
  return "flexitarian";
}

// POST /onboarding/profile
router.post("/profile", async (req, res) => {
  try {
    const {
      eatingStyle,
      dietaryRestrictions,
      cuisinePreferences,
      cookingStylePreferences,
      sproutName,
    } = req.body;

    console.log("🌱 POST /onboarding/profile - Creating new user:", {
      eatingStyle,
      dietaryRestrictions: dietaryRestrictions?.length || 0,
      cuisinePreferences: cuisinePreferences?.length || 0,
      cookingStylePreferences: cookingStylePreferences?.length || 0,
      sproutName
    });

    const dietLevel = eatingStyleToDietLevel(eatingStyle);

    const user = await User.create({
      name: "User",
      dietLevel,
      extraForbiddenTags: dietaryRestrictions || [],
      preferredCuisines: cuisinePreferences || [],
      cookingStylePreferences: cookingStylePreferences || [],
      sproutName: sproutName || "Bud",
    });

    console.log("✅ User created in MongoDB with ID:", user._id.toString());

    await UserImpact.create({
      user_id: user._id,
      xp: 0,
      coins: 0,
      streak_days: 0,
      total_meals_logged: 0,
      forest_stage: "SEED",
    });

    console.log("✅ UserImpact created for user:", user._id.toString());

    const profile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle,
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Bud",
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      coins: 0,
      streakDays: 0,
    };

    res.json(profile);
  } catch (err) {
    console.error("Create profile error:", err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

export default router;
