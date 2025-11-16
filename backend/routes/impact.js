// routes/impact.js
import express from "express";
import UserImpact from "../models/UserImpact.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET /impact/:userId
 */
router.get("/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const impact = await UserImpact.findOne({ user_id: userId }).lean();
    if (!impact) {
      return res.json({
        total_meals_logged: 0,
        xp: 0,
        forest_stage: "SEED",
        streak_days: 0,
      });
    }

    res.json(impact);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /impact/update
 * body: { user_id }
 *
 * XP RULES:
 *  - +10 XP per meal
 *  - +20 XP per streak increase
 */
router.post("/update", async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let impact = await UserImpact.findOne({ user_id });

    if (!impact) {
      impact = await UserImpact.create({
        user_id,
        total_meals_logged: 0,
        xp: 0,
        streak_days: 0,
        last_activity_date: null,
        forest_stage: "SEED",
      });
    }

    const today = new Date();
    const last = impact.last_activity_date
      ? new Date(impact.last_activity_date)
      : null;

    // streak logic
    let streakBonus = 0;

    if (!last) {
      impact.streak_days = 1;
      streakBonus = 20;
    } else {
      const diffDays = Math.floor(
        (today - last) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        impact.streak_days += 1;
        streakBonus = 20;
      } else if (diffDays > 1) {
        impact.streak_days = 1;
        streakBonus = 20;
      }
      // diffDays === 0 → same-day log, no streak bonus
    }

    const mealXP = 10;
    const xpAwarded = mealXP + streakBonus;

    impact.total_meals_logged += 1;
    impact.xp += xpAwarded;
    impact.last_activity_date = today;

    // forest stages
    if (impact.xp < 50) impact.forest_stage = "SEED";
    else if (impact.xp < 200) impact.forest_stage = "SPROUT";
    else if (impact.xp < 500) impact.forest_stage = "SAPLING";
    else if (impact.xp < 1500) impact.forest_stage = "FOREST";
    else impact.forest_stage = "ANCIENT_FOREST";

    await impact.save();

    res.json({
      xp_awarded: xpAwarded,
      meal_xp: mealXP,
      streak_bonus: streakBonus,
      total_meals_logged: impact.total_meals_logged,
      xp: impact.xp,
      streak_days: impact.streak_days,
      forest_stage: impact.forest_stage,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
