import express from "express";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

const router = express.Router();

function computeLevelAndXpToNext(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100 || 0);
  return { level, xpToNextLevel };
}

// GET /home/summary?userId=...
router.get("/summary", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
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

    const impact = await UserImpactStorage.findOne({ user_id: user._id });
    const xp = impact?.xp || 0;
    const coins = impact?.coins || 0;
    const streakDays = impact?.streak_days || 0;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    // static missions for now
    const missions = [
      {
        id: "log_meal",
        title: "Log one vegan meal today",
        xpReward: 20,
        coinReward: 5,
        isCompleted: false,
      },
      {
        id: "scan_ingredients",
        title: "Scan ingredients of a product",
        xpReward: 10,
        coinReward: 3,
        isCompleted: false,
      },
    ];

    res.json({
      level,
      xp,
      xpToNextLevel,
      coins,
      streakDays,
      missions,
    });
  } catch (err) {
    console.error("home summary error:", err);
    res.status(500).json({ error: "Failed to load home summary" });
  }
});

export default router;
