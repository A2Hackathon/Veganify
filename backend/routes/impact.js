import express from "express";
import UserImpact from "../models/UserImpact.js";
import User from "../models/User.js";

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

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    let impact = await UserImpact.findOne({ user_id: userId });
    if (!impact) {
      impact = await UserImpact.create({
        user_id: userId,
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
    await impact.save();

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
