// routes/cookWithThis.js (Albert, updated to match new impact system)
import express from "express";
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
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required to get groceries" });
    }

    // Handle ALBERT_SHARED_USER - convert user_id to userId format
    const userId = user_id === "ALBERT_SHARED_USER" ? "ALBERT_SHARED_USER" : user_id;
    
    // Get all groceries for this user
    let groceries = [];
    if (userId === "ALBERT_SHARED_USER") {
      const { UserStorage } = await import("../utils/jsonStorage.js");
      const user = await UserStorage.findOne({ sproutName: "Albert" });
      if (user) {
        groceries = await GroceryItemStorage.find({ userId: user._id });
      }
    } else {
      groceries = await GroceryItemStorage.find({ userId });
    }

    // Convert to ingredient names
    const ingredients = groceries.map(g => g.name);

    // generate 3 recipes
    console.log("🔍 Calling LLM (generateRecipes) for 'Cook With This' feature...");
    const recipes = await generateRecipes(ingredients, 3);
    console.log("✅ LLM generated", recipes?.length || 0, "recipes");

    let progress = null;

    if (user_id) {
      // Get user ID for impact
      let userObjectId;
      if (userId === "ALBERT_SHARED_USER") {
        const { UserStorage } = await import("../utils/jsonStorage.js");
        const user = await UserStorage.findOne({ sproutName: "Albert" });
        if (!user) {
          return res.json({ recipes, progress: null });
        }
        userObjectId = user._id;
      } else {
        userObjectId = userId;
      }

      // find or create UserImpact (ensure required structure)
      let impact = await UserImpactStorage.findOne({ user_id: userObjectId });

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

      // Award XP for using "Cook With This"
      const xpAward = 5;
      impact.xp += xpAward;

      // Recalculate forest stage
      if (impact.xp < 50) impact.forest_stage = "SEED";
      else if (impact.xp < 200) impact.forest_stage = "SPROUT";
      else if (impact.xp < 500) impact.forest_stage = "SAPLING";
      else if (impact.xp < 1500) impact.forest_stage = "FOREST";
      else impact.forest_stage = "ANCIENT_FOREST";

      await UserImpactStorage.save(impact);

      progress = {
        xp: impact.xp,
        forest_stage: impact.forest_stage
      };
    }

    res.json({ recipes, progress });
  } catch (err) {
    next(err);
  }
});

export default router;
