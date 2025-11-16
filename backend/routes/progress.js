import express from "express";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

const router = express.Router();

function computeLevelAndXpToNext(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100 || 0);
  return { level, xpToNextLevel };
}

function dietLevelToEatingStyle(d) {
  switch ((d || "").toLowerCase()) {
    case "vegan":
      return "Vegan";
    case "ovo":
      return "Ovo-vegetarian";
    case "lacto":
      return "Lacto-vegetarian";
    case "lacto_ovo":
      return "Lacto-ovo vegetarian";
    case "pescatarian":
      return "Pescatarian";
    case "vegetarian":
      return "Vegetarian";
    default:
      return "Flexitarian";
  }
}

function missionRewards(missionId) {
  switch (missionId) {
    case "log_meal":
      return { xp: 20, coins: 5 };
    case "scan_ingredients":
      return { xp: 10, coins: 3 };
    default:
      return { xp: 10, coins: 2 };
  }
}

// POST /progress/complete-mission
router.post("/complete-mission", async (req, res) => {
  try {
    const { userId, missionId } = req.body;
    if (!userId || !missionId)
      return res.status(400).json({ error: "userId and missionId required" });

    // Handle ALBERT_SHARED_USER
    let user;
    if (userId === "ALBERT_SHARED_USER") {
      user = await UserStorage.findOne({ sproutName: "Albert" });
      if (!user) return res.status(404).json({ error: "Albert user not found" });
    } else {
      user = await UserStorage.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
    }

    let impact = await UserImpactStorage.findOne({ user_id: user._id });
    if (!impact) {
      impact = await UserImpactStorage.create({
        user_id: user._id,
        xp: 0,
        coins: 0,
        streak_days: 0,
        total_meals_logged: 0,
        forest_stage: "SEED",
      });
    }

    const reward = missionRewards(missionId);
    impact.xp += reward.xp;
    impact.coins += reward.coins;
    await UserImpactStorage.save(impact);

    const xp = impact.xp;
    const coins = impact.coins;
    const streakDays = impact.streak_days || 0;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    const profile = {
      id: user._id || user.id,
      userName: user.name || "User",
      eatingStyle: dietLevelToEatingStyle(user.dietLevel),
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Albert",
      level,
      xp,
      xpToNextLevel,
      coins,
      streakDays,
    };

    res.json(profile);
  } catch (err) {
    console.error("complete-mission error:", err);
    res.status(500).json({ error: "Failed to complete mission" });
  }
});

export default router;
