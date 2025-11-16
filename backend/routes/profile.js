import express from "express";
import User from "../models/User.js";
import UserImpact from "../models/UserImpact.js";

const router = express.Router();

function computeLevelAndXpToNext(xp) {
  // simple leveling: 100 xp per level
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

// GET /profile?userId=...
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const impact = await UserImpact.findOne({ user_id: userId }).lean();
    const xp = impact?.xp || 0;
    const coins = impact?.coins || 0;
    const streakDays = impact?.streak_days || 0;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    const profile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle: dietLevelToEatingStyle(user.dietLevel),
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Bud",
      level,
      xp,
      xpToNextLevel,
      coins,
      streakDays,
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
    const profile = req.body;
    const userId = profile.id;

    if (!userId) return res.status(400).json({ error: "id required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.name = profile.userName || user.name;
    user.extraForbiddenTags = profile.dietaryRestrictions || [];
    user.preferredCuisines = profile.cuisinePreferences || [];
    user.cookingStylePreferences = profile.cookingStylePreferences || [];
    user.sproutName = profile.sproutName || user.sproutName;
    
    // Convert eatingStyle back to dietLevel
    if (profile.eatingStyle) {
      const val = profile.eatingStyle.toLowerCase();
      if (val.includes("vegan")) user.dietLevel = "vegan";
      else if (val.includes("ovo-vegetarian")) user.dietLevel = "ovo";
      else if (val.includes("lacto-ovo")) user.dietLevel = "lacto_ovo";
      else if (val.includes("lacto-vegetarian")) user.dietLevel = "lacto";
      else if (val.includes("pescatarian")) user.dietLevel = "pescatarian";
      else if (val.includes("vegetarian")) user.dietLevel = "vegetarian";
      else user.dietLevel = "flexitarian";
    }
    
    await user.save();

    const impact = await UserImpact.findOne({ user_id: userId }).lean();
    const xp = impact?.xp || 0;
    const coins = impact?.coins || 0;
    const streakDays = impact?.streak_days || 0;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    const updatedProfile = {
      id: user._id.toString(),
      userName: user.name || "User",
      eatingStyle: dietLevelToEatingStyle(user.dietLevel),
      dietaryRestrictions: user.extraForbiddenTags || [],
      cuisinePreferences: user.preferredCuisines || [],
      cookingStylePreferences: user.cookingStylePreferences || [],
      sproutName: user.sproutName || "Bud",
      level,
      xp,
      xpToNextLevel,
      coins,
      streakDays,
    };

    res.json(updatedProfile);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /profile/parse-restrictions
router.post("/parse-restrictions", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    // simple placeholder: split by comma or newline
    const restrictions = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    res.json({ restrictions });
  } catch (err) {
    console.error("parse-restrictions error:", err);
    res.status(500).json({ error: "Failed to parse restrictions" });
  }
});

export default router;
