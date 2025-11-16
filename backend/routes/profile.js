import express from "express";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

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

    let user;
    
    // Handle shared Albert user - find or create user with sproutName "Albert"
    if (userId === "ALBERT_SHARED_USER") {
      console.log("?” Looking for shared Albert user...");
      user = await UserStorage.findOne({ sproutName: "Albert" });
      
      if (!user) {
        console.log("?Œ± Shared Albert user not found, creating...");
        // Create shared Albert user
        user = await UserStorage.create({
          name: "User",
          dietLevel: "vegan",
          extraForbiddenTags: [],
          preferredCuisines: ["Chinese"],
          cookingStylePreferences: ["Spicy"],
          sproutName: "Albert",
        });
        
        // Create UserImpact for Albert
        try {
          await UserImpactStorage.create({
            user_id: user._id,
            xp: 0,
            coins: 0,
            streak_days: 0,
            total_meals_logged: 0,
            forest_stage: "SEED",
          });
          console.log("??UserImpact created for shared Albert user");
        } catch (impactErr) {
          console.error("? ï¸ Failed to create UserImpact for Albert (non-critical):", impactErr.message);
        }
        
        console.log("??Shared Albert user created with ID:", user._id);
      } else {
        console.log("??Found existing shared Albert user:", user._id);
      }
    } else {
      // All users must use Albert - redirect to Albert user
      console.log("? ï¸ Non-Albert userId provided, redirecting to Albert user");
      user = await UserStorage.findOne({ sproutName: "Albert" });
      if (!user) {
        // Create Albert if it doesn't exist
        user = await UserStorage.create({
          name: "User",
          dietLevel: "vegan",
          extraForbiddenTags: [],
          preferredCuisines: ["Chinese"],
          cookingStylePreferences: ["Spicy"],
          sproutName: "Albert",
        });
      }
    }

    // Get user's ID for impact lookup
    const userObjectId = user._id;
    const impact = await UserImpactStorage.findOne({ user_id: userObjectId });
    const xp = impact?.xp || 0;
    const coins = impact?.coins || 0;
    const streakDays = impact?.streak_days || 0;
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
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// PATCH /profile
router.patch("/", async (req, res) => {
  try {
    const profile = req.body;
    const userId = profile.id;

    console.log("?“ PATCH /profile - Received update request:", {
      userId,
      eatingStyle: profile.eatingStyle,
      dietaryRestrictions: profile.dietaryRestrictions?.length || 0,
      cuisinePreferences: profile.cuisinePreferences?.length || 0,
      cookingStylePreferences: profile.cookingStylePreferences?.length || 0,
      sproutName: profile.sproutName
    });

    if (!userId) return res.status(400).json({ error: "id required" });

    let user;
    let userObjectId;
    
    // ALWAYS use the single Albert user
    user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Create Albert if it doesn't exist
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }
    userObjectId = user._id;

    // Convert eatingStyle back to dietLevel
    let dietLevel = user.dietLevel;
    if (profile.eatingStyle) {
      const val = profile.eatingStyle.toLowerCase();
      if (val.includes("vegan")) dietLevel = "vegan";
      else if (val.includes("ovo-vegetarian")) dietLevel = "ovo";
      else if (val.includes("lacto-ovo")) dietLevel = "lacto_ovo";
      else if (val.includes("lacto-vegetarian")) dietLevel = "lacto";
      else if (val.includes("pescatarian")) dietLevel = "pescatarian";
      else if (val.includes("vegetarian")) dietLevel = "vegetarian";
      else dietLevel = "flexitarian";
    }
    
    // Update user
    user = await UserStorage.findByIdAndUpdate(userObjectId, {
      name: profile.userName || user.name,
      dietLevel: dietLevel,
      extraForbiddenTags: profile.dietaryRestrictions || [],
      preferredCuisines: profile.cuisinePreferences || [],
      cookingStylePreferences: profile.cookingStylePreferences || [],
      sproutName: profile.sproutName || user.sproutName,
    });
    
    console.log("??Profile saved to JSON storage:", {
      userId: user._id,
      dietLevel: user.dietLevel,
      extraForbiddenTags: user.extraForbiddenTags.length,
      preferredCuisines: user.preferredCuisines.length,
      cookingStylePreferences: user.cookingStylePreferences.length,
      sproutName: user.sproutName
    });

    const impact = await UserImpactStorage.findOne({ user_id: userObjectId });
    const xp = impact?.xp || 0;
    const coins = impact?.coins || 0;
    const streakDays = impact?.streak_days || 0;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    const updatedProfile = {
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
