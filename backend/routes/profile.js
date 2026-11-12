import express from "express";
import { validateProfileInput } from "../utils/profileInput.js";
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
      user = await UserStorage.findOne({ sproutName: "Albert" });
      
      if (!user) {
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
        } catch {
          console.error("Failed to create UserImpact for Albert (non-critical):");
        }

      }
    } else {
      // All users must use Albert - redirect to Albert user

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
  } catch {
    console.error("Get profile error:");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// PATCH /profile
router.patch("/", async (req, res) => {
  let requestedDiet;
  try {
    requestedDiet = validateProfileInput(req.body);
  } catch { return res.status(400).json({ error: "Provide a valid id and bounded profile fields" }); }
  try {
    const profile = req.body;
    const userId = profile.id;

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

    const dietLevel = requestedDiet ?? user.dietLevel;

    // Update user
    user = await UserStorage.findByIdAndUpdate(userObjectId, {
      name: profile.userName || user.name,
      dietLevel: dietLevel,
      extraForbiddenTags: profile.dietaryRestrictions ?? user.extraForbiddenTags ?? [],
      preferredCuisines: profile.cuisinePreferences ?? user.preferredCuisines ?? [],
      cookingStylePreferences: profile.cookingStylePreferences ?? user.cookingStylePreferences ?? [],
      // Shared-demo lookup uses this fixed identity across all routes.
      sproutName: "Albert",
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
  } catch {
    console.error("Update profile error:");
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
  } catch {
    console.error("parse-restrictions error:");
    res.status(500).json({ error: "Failed to parse restrictions" });
  }
});

export default router;
