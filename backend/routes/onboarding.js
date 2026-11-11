import express from "express";
import { eatingStyleToDietLevel } from "../utils/dietMapping.js";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

const router = express.Router();

router.post("/profile", async (req, res) => {
  let dietLevel;
  try { dietLevel = eatingStyleToDietLevel(req.body?.eatingStyle); }
  catch { return res.status(400).json({ error: "Provide a supported eatingStyle" }); }
  try {
    const {
      eatingStyle,
      dietaryRestrictions,
      cuisinePreferences,
      cookingStylePreferences,
    } = req.body;

    let user = await UserStorage.findOne({ sproutName: "Albert" });
    
    if (user) {
      user = await UserStorage.findByIdAndUpdate(user._id, {
        dietLevel: dietLevel || "vegan",
        extraForbiddenTags: dietaryRestrictions || [],
        preferredCuisines: cuisinePreferences || ["Chinese"],
        cookingStylePreferences: cookingStylePreferences || ["Spicy"],
        sproutName: "Albert",
      });
    } else {
      user = await UserStorage.create({
        name: "User",
        dietLevel: dietLevel || "vegan",
        extraForbiddenTags: dietaryRestrictions || [],
        preferredCuisines: cuisinePreferences || ["Chinese"],
        cookingStylePreferences: cookingStylePreferences || ["Spicy"],
        sproutName: "Albert",
      });
    }

    try {
      await UserImpactStorage.create({
        user_id: user._id,
        xp: 0,
        coins: 0,
        streak_days: 0,
        total_meals_logged: 0,
        forest_stage: "SEED",
      });
    } catch {
      console.error("Failed to create UserImpact (non-critical):");
    }

    const profile = {
      id: user._id || user.id,
      userName: user.name || "User",
      eatingStyle,
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Albert",
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      coins: 0,
      streakDays: 0,
    };

    res.json(profile);
  } catch {
    console.error("Create profile error:");
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to create profile"
      });
    }
  }
});

export default router;
