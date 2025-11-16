import express from "express";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

const router = express.Router();

function computeLevelAndXpToNext(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100 || 0);
  return { level, xpToNextLevel };
}

// Example: POST /impact/log-meal
router.post("/log-meal", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

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

    const today = new Date();
    const last = impact.last_activity_date
      ? new Date(impact.last_activity_date)
      : null;

    if (!last) {
      impact.streak_days = 1;
    } else {
      const diff = Math.floor(
        (today - last) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) {
        impact.streak_days += 1;
      } else if (diff > 1) {
        impact.streak_days = 1;
      }
    }

    impact.total_meals_logged += 1;
    impact.xp += 10;
    impact.last_activity_date = today;
    await UserImpactStorage.save(impact);

    const xp = impact.xp;
    const coins = impact.coins;
    const streakDays = impact.streak_days;
    const { level, xpToNextLevel } = computeLevelAndXpToNext(xp);

    res.json({
      xp,
      coins,
      streakDays,
      level,
      xpToNextLevel,
      total_meals_logged: impact.total_meals_logged,
    });
  } catch (err) {
    console.error("log-meal error:", err);
    res.status(500).json({ error: "Failed to log meal" });
  }
});

export default router;
