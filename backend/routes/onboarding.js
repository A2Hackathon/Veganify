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
      sproutName,
    } = req.body;

    console.log("POST /onboarding/profile - Creating new user:", {
      eatingStyle,
      dietaryRestrictions: dietaryRestrictions?.length || 0,
      cuisinePreferences: cuisinePreferences?.length || 0,
      cookingStylePreferences: cookingStylePreferences?.length || 0,
      sproutName
    });


    console.log("Ensuring single Albert user exists...");
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    
    if (user) {
      console.log("Found existing Albert user, updating preferences...");
      user = await UserStorage.findByIdAndUpdate(user._id, {
        dietLevel: dietLevel || "vegan",
        extraForbiddenTags: dietaryRestrictions || [],
        preferredCuisines: cuisinePreferences || ["Chinese"],
        cookingStylePreferences: cookingStylePreferences || ["Spicy"],
        sproutName: "Albert",
      });
    } else {
      console.log("Creating single Albert user...");
      user = await UserStorage.create({
        name: "User",
        dietLevel: dietLevel || "vegan",
        extraForbiddenTags: dietaryRestrictions || [],
        preferredCuisines: cuisinePreferences || ["Chinese"],
        cookingStylePreferences: cookingStylePreferences || ["Spicy"],
        sproutName: "Albert",
      });
    }

    console.log("User created in JSON storage with ID:", user._id);

    try {
      await UserImpactStorage.create({
        user_id: user._id,
        xp: 0,
        coins: 0,
        streak_days: 0,
        total_meals_logged: 0,
        forest_stage: "SEED",
      });
      console.log("UserImpact created for user:", user._id);
    } catch (impactErr) {
      console.error("Failed to create UserImpact (non-critical):", impactErr.message);
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

    console.log("Sending profile response to client");
    res.json(profile);
  } catch (err) {
    console.error("Create profile error:", err);
    console.error("   Error stack:", err.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to create profile",
        message: err.message 
      });
    }
  }
});

export default router;
