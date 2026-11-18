import { createHash } from "node:crypto";
import express from "express";
import { UserStorage, UserImpactStorage } from "../utils/jsonStorage.js";

const router = express.Router();
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MEAL_RECEIPTS = 1000;
class MealConflict extends Error {}
class ReceiptCapacity extends Error {}

function progressResponse(impact) {
  return {
    xp: impact.xp, coins: impact.coins, streakDays: impact.streak_days,
    ...computeLevelAndXpToNext(impact.xp), total_meals_logged: impact.total_meals_logged,
  };
}

function computeLevelAndXpToNext(xp) {
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100 || 0);
  return { level, xpToNextLevel };
}

// Example: POST /impact/log-meal
router.post("/log-meal", async (req, res) => {
  const userId = req.body?.userId;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 128) {
    return res.status(400).json({ error: "userId must contain 1 to 128 characters" });
  }
  const key = req.headers?.['idempotency-key'];
  if (key !== undefined && (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(key))) {
    return res.status(400).json({error: "Idempotency-Key must contain 1 to 128 ASCII letters, digits, . _ : -"});
  }
  const fingerprint = createHash('sha256').update(JSON.stringify({userId})).digest('hex');
  try {
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

    let response;
    impact = await UserImpactStorage.update(user._id, impact => {
      const today = new Date();
      let receipts;
      if (key !== undefined) {
        receipts = impact.meal_receipts ?? [];
        if (!Array.isArray(receipts) || receipts.length > MAX_MEAL_RECEIPTS || receipts.some(receipt =>
          !receipt || typeof receipt.key !== 'string' || typeof receipt.fingerprint !== 'string' ||
          !Number.isSafeInteger(receipt.created_ms) || !receipt.response || typeof receipt.response !== 'object')) {
          throw new Error('Invalid meal receipts');
        }
        // Do not evict an unexpired receipt: that would let an accepted retry award XP again.
        receipts = receipts.filter(receipt => today.getTime() - receipt.created_ms < RECEIPT_TTL_MS);
        const previous = receipts.find(receipt => receipt.key === key);
        if (previous) {
          if (previous.fingerprint !== fingerprint) throw new MealConflict();
          response = previous.response;
          return;
        }
        if (receipts.length >= MAX_MEAL_RECEIPTS) throw new ReceiptCapacity();
      }
      const last = impact.last_activity_date
        ? new Date(impact.last_activity_date)
        : null;

      // Streaks use UTC dates so host timezone and daylight-saving changes do not affect them.
      const dayMs = 24 * 60 * 60 * 1000;
      const dayDifference = last
        ? Math.floor(today.getTime() / dayMs) - Math.floor(last.getTime() / dayMs)
        : NaN;
      if (dayDifference === 1) {
        impact.streak_days += 1;
      } else if (dayDifference !== 0) {
        // First activity, a missed day, or an invalid/future stored timestamp starts a new streak.
        impact.streak_days = 1;
      }

      impact.total_meals_logged += 1;
      impact.xp += 10;
      impact.last_activity_date = today;
      response = progressResponse(impact);
      if (key !== undefined) {
        impact.meal_receipts = [...receipts, {key, fingerprint, created_ms: today.getTime(), response}];
      }

    });

    res.json(response);
  } catch (error) {
    if (error instanceof MealConflict) return res.status(409).json({error: "Idempotency key already used for different input"});
    if (error instanceof ReceiptCapacity) return res.status(503).json({error: "Meal retry receipt capacity reached; retry later with the same key"});
    console.error("Failed to log meal");
    res.status(500).json({ error: "Failed to log meal" });
  }
});

export default router;
