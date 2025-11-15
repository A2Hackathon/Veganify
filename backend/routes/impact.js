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
    const impact = await UserImpact.findOne({ user_id: userId }).lean();
    if (!impact) return res.json({ total_meals_logged: 0, xp: 0 });
    res.json(impact);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /impact/update
 * body: { user_id }
 *
 * XP RULES (decided by Albert):
 * - +10 XP for each logged meal
 * - +20 XP bonus for each new day streak increment
 */
router.post("/update", async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // find or create the user impact doc
    let impact = await UserImpact.findOne({ user_id });

    if (!impact) {
      impact = await UserImpact.create({
        user_id,
        total_meals_logged: 0,
        xp: 0,
        streak: 0,
        last_activity_date: null,
        forest_stage: "SEED"
      });
    }

    const today = new Date();
    const last = impact.last_activity_date ? new Date(impact.last_activity_date) : null;

    // streak logic
    let streakBonus = 0;
    if (!last) {
      // first time ever logging → start streak
      impact.streak = 1;
      streakBonus = 20;
    } else {
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // daily streak continues
        impact.streak += 1;
        streakBonus = 20;
      } else if (diffDays > 1) {
        // streak broken
        impact.streak = 1;
        streakBonus = 20; // restart bonus
      }
      // diffDays === 0 → same day logged again, no streak bonus
    }

    // base XP for the meal
    const mealXP = 10;

    // total XP awarded this update
    const xpAwarded = mealXP + streakBonus;

    impact.total_meals_logged += 1;
    impact.xp += xpAwarded;
    impact.last_activity_date = today;

    // forest stage progression
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
      streak: impact.streak,
      totals: impact,
      progress: {
        xp: impact.xp,
        forest_stage: impact.forest_stage,
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
