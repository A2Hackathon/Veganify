// routes/cookWithThis.js (Albert, updated to match new impact system)
import express from "express";
import { createHash } from "node:crypto";
import { parseIngredients } from "../utils/scanResults.js";
import { generateRecipes } from "../utils/llmClient.js";
import { UserImpactStorage, GroceryItemStorage } from "../utils/jsonStorage.js";
const router = express.Router();
const RETRY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RECEIPTS = 100;
const MAX_RESPONSE_BYTES = 128 * 1024;
class CookRetryError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function cookReceipts(impact, key, fingerprint) {
  const all = impact?.cook_receipts ?? [];
  if (!Array.isArray(all) || all.length > MAX_RECEIPTS || all.some(receipt =>
    !receipt || typeof receipt.key !== 'string' || typeof receipt.fingerprint !== 'string' ||
    !Number.isSafeInteger(receipt.created_ms) || !receipt.response || typeof receipt.response !== 'object')) {
    throw new Error('Invalid cooking receipts');
  }
  const receipts = all.filter(receipt => Date.now() - receipt.created_ms < RETRY_TTL_MS);
  const previous = receipts.find(receipt => receipt.key === key);
  if (previous && previous.fingerprint !== fingerprint) {
    throw new CookRetryError(409, 'Idempotency key already used for different input');
  }
  if (!previous && receipts.length >= MAX_RECEIPTS) {
    throw new CookRetryError(503, 'Cooking retry receipt capacity reached; retry later with the same key');
  }
  return {receipts, previous};
}


/**
 * POST /recipes/from-ingredients
 * body: { user_id }; ingredients come from the stored grocery list.
 *
 * XP RULES:
 * - +5 XP for generating recipes from ingredients
 * - Does NOT count as a meal
 * - Does NOT affect streak
 */

router.post("/", async (req, res, next) => {
  const controller = new AbortController();
  const cancel = () => { if (!res.writableFinished) controller.abort(); };
  req.once('aborted', cancel);
  res.once('close', cancel);
  if (req.aborted || res.destroyed) controller.abort();
  try {
    controller.signal.throwIfAborted();
    const user_id = req.body?.user_id;

    if (typeof user_id !== "string" || !user_id.trim() || user_id.length > 128) {
      return res.status(400).json({ error: "user_id must contain 1 to 128 characters" });
    }

    const key = req.headers?.['idempotency-key'];
    if (key !== undefined && (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(key))) {
      return res.status(400).json({error: 'Invalid Idempotency-Key; use 1 to 128 ASCII letters, digits, . _ : -'});
    }
    const fingerprint = createHash('sha256').update(JSON.stringify({user_id})).digest('hex');

    // ALWAYS use the single Albert user
    const { UserStorage } = await import("../utils/jsonStorage.js");
    controller.signal.throwIfAborted();
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    controller.signal.throwIfAborted();
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
    
    controller.signal.throwIfAborted();
    if (key !== undefined) {
      const current = await UserImpactStorage.findOne({user_id: user._id});
      controller.signal.throwIfAborted();
      const {previous} = cookReceipts(current, key, fingerprint);
      if (previous) return res.json(previous.response);
    }
    // Get all groceries for Albert
    const groceries = await GroceryItemStorage.find({ userId: user._id });
    controller.signal.throwIfAborted();

    // Convert to ingredient names
    let ingredients;
    try { ingredients = parseIngredients({ ingredients: groceries.map(g => g.name) }); }
    catch { return res.status(400).json({ error: "Add 1 to 100 valid grocery names (200 characters each, 8000 total) before generating recipes" }); }

    // generate 3 recipes
    console.log("?” Calling LLM (generateRecipes) for 'Cook With This' feature...");
    const recipes = await generateRecipes(ingredients, 3, user, {signal: controller.signal});
    controller.signal.throwIfAborted();
    console.log("??LLM generated", recipes?.length || 0, "recipes");

    let response;

    if (user_id) {
      // Use Albert's ID for impact
      const userObjectId = user._id;

      // find or create UserImpact (ensure required structure)
      let impact = await UserImpactStorage.findOne({ user_id: userObjectId });
      controller.signal.throwIfAborted();

      if (!impact) {
        impact = await UserImpactStorage.create({
          user_id: userObjectId,
          xp: 0,
          total_meals_logged: 0,
          streak_days: 0,
          forest_stage: "SEED",
          last_activity_date: null
        });
      }

      controller.signal.throwIfAborted();
      // Award XP for using "Cook With This"
      const xpAward = 5;
      impact = await UserImpactStorage.update(userObjectId, current => {
        let receipts;
        if (key !== undefined) {
          // Recheck inside the same synchronous mutation that awards XP.
          const state = cookReceipts(current, key, fingerprint);
          if (state.previous) { response = state.previous.response; return; }
          receipts = state.receipts;
        }
        current.xp += xpAward;

        // Recalculate forest stage
        if (current.xp < 50) current.forest_stage = "SEED";
        else if (current.xp < 200) current.forest_stage = "SPROUT";
        else if (current.xp < 500) current.forest_stage = "SAPLING";
        else if (current.xp < 1500) current.forest_stage = "FOREST";
        else current.forest_stage = "ANCIENT_FOREST";
        response = {recipes, progress: {xp: current.xp, forest_stage: current.forest_stage}};
        if (key !== undefined) {
          if (Buffer.byteLength(JSON.stringify(response), 'utf8') > MAX_RESPONSE_BYTES) {
            throw new CookRetryError(502, 'Cooking response exceeds retry storage limit');
          }
          current.cook_receipts = [...receipts, {key, fingerprint, created_ms: Date.now(), response}];
        }
      });
    }

    controller.signal.throwIfAborted();
    res.json(response);
  } catch (err) {
    if (controller.signal.aborted) return;
    if (err instanceof CookRetryError) return res.status(err.status).json({error: err.message});
    next(err);
  } finally {
    req.removeListener('aborted', cancel);
    res.removeListener('close', cancel);
  }
});

export default router;
