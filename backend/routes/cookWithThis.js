// routes/cookWithThis.js (Albert, updated to match new impact system)
import express from "express";
import { parseIngredients } from "../utils/scanResults.js";
import { generateRecipes } from "../utils/llmClient.js";
import { UserImpactStorage, GroceryItemStorage } from "../utils/jsonStorage.js";
const router = express.Router();

/**
 * POST /recipes/from-ingredients
 * body: { ingredients: ["tofu","rice"], user_id? }
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

    let progress = null;

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
        current.xp += xpAward;

        // Recalculate forest stage
        if (current.xp < 50) current.forest_stage = "SEED";
        else if (current.xp < 200) current.forest_stage = "SPROUT";
        else if (current.xp < 500) current.forest_stage = "SAPLING";
        else if (current.xp < 1500) current.forest_stage = "FOREST";
        else current.forest_stage = "ANCIENT_FOREST";
      });

      progress = {
        xp: impact.xp,
        forest_stage: impact.forest_stage
      };
    }

    controller.signal.throwIfAborted();
    res.json({ recipes, progress });
  } catch (err) {
    if (controller.signal.aborted) return;
    next(err);
  } finally {
    req.removeListener('aborted', cancel);
    res.removeListener('close', cancel);
  }
});

export default router;
