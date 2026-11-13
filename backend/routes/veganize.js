import express from "express";
import { parseVeganizeRequest } from "../utils/recipeInput.js";
import { UserStorage, RecipeStorage } from "../utils/jsonStorage.js";
import { extractIngredients, rewriteRecipeSteps, isAllowedForUser } from "../utils/llmClient.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /veganize/analyze
router.post("/analyze", async (req, res) => {
  let input;
  try { input = parseVeganizeRequest(req.body); }
  catch { return res.status(400).json({ error: "Invalid recipe adaptation request" }); }
  try {
    const { recipeContent } = input;

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

    const ingredients = await extractIngredients(recipeContent);

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    const checks = await isAllowedForUser(prefs, ingredients);

    // Load substitutions config for suggestions
    const substitutions = JSON.parse(readFileSync(join(__dirname, "../config/substitutions.json"), "utf-8"));
    const dietLevel = user.dietLevel?.toLowerCase() || "vegan";

    const problematic = checks
      .filter(c => c.allowed !== "Allowed")
      .map((c) => {
        // Get suggestions from LLM response first
        let suggestions = Array.isArray(c.suggestions) ? c.suggestions : [];
        
        // If no suggestions from LLM, try to get from substitutions config
        if (suggestions.length === 0) {
          const ingredientKey = c.ingredient.toUpperCase();
          if (substitutions[ingredientKey]?.[dietLevel]) {
            suggestions = substitutions[ingredientKey][dietLevel];
          }
        }

        return {
          original: c.ingredient,
          suggestions: suggestions,
        };
      });

    res.json({
      success: true,
      violatesCount: problematic.length,
      problematicIngredients: problematic,
    });
  } catch {
    console.error("veganize analyze error:");
    res.status(500).json({ error: "Failed to analyze recipe" });
  }
});

// POST /veganize/commit
router.post("/commit", async (req, res) => {
  let input;
  try { input = parseVeganizeRequest(req.body, { commit: true }); }
  catch { return res.status(400).json({ error: "Invalid recipe adaptation request" }); }
  try {
    const { userId: actualUserId, recipeContent, subs, originalPrompt } = input;

    // The demo's shared profile supplies restrictions when the client omits an ID.
    const user = !actualUserId || actualUserId === "ALBERT_SHARED_USER"
      ? await UserStorage.findOne({ sproutName: "Albert" })
      : await UserStorage.findById(actualUserId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const rewritten = await rewriteRecipeSteps(subs, recipeContent, user);

    // simple split of steps by line
    const steps = rewritten
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const substitutionMap = Object.fromEntries(subs.map(s => [s.original, s.substitute]));

    const savedRecipe = await RecipeStorage.create({
      userId: user?._id || null,
      title: "Veganized Recipe",
      tags: ["veganized"],
      duration: "",
      ingredients: [],
      steps,
      previewImageUrl: "",
      originalPrompt: originalPrompt || "",
      type: "veganized",
      substitutionMap,
    });

    const adaptedRecipe = {
      id: savedRecipe._id || savedRecipe.id,
      userId: savedRecipe.userId || null,
      title: savedRecipe.title,
      tags: savedRecipe.tags,
      duration: savedRecipe.duration,
      ingredients: subs.map(s => ({ original: s.original, substitute: s.substitute })),
      steps: savedRecipe.steps,
      text: savedRecipe.steps.join("\n"),
      previewImageUrl: savedRecipe.previewImageUrl,
      originalPrompt: savedRecipe.originalPrompt,
      type: savedRecipe.type,
      substitutionMap: savedRecipe.substitutionMap,
    };

    res.json({ adaptedRecipe });
  } catch {
    console.error("veganize commit error:");
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

export default router;
