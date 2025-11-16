import express from "express";
import User from "../models/User.js";
import Recipe from "../models/Recipe.js";
import { extractIngredients, rewriteRecipeSteps, isAllowedForUser } from "../utils/llmClient.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /veganize/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { userId, userID, recipeText, recipe } = req.body;
    const actualUserId = userId || userID; // Support both userId and userID
    const recipeContent = recipeText || recipe; // Support both parameter names
    if (!actualUserId || !recipeContent) {
      return res.status(400).json({ error: "userId/userID and recipeText/recipe required" });
    }

    const user = await User.findById(actualUserId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

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
      .filter((c) => c.allowed !== "Allowed")
      .map((c) => {
        // Get suggestions from substitutions config
        const ingredientKey = c.ingredient.toUpperCase();
        let suggestions = c.suggestions || [];
        
        // If no suggestions from LLM, try to get from substitutions config
        if (suggestions.length === 0 && substitutions[ingredientKey]?.[dietLevel]) {
          suggestions = substitutions[ingredientKey][dietLevel];
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
  } catch (err) {
    console.error("veganize analyze error:", err);
    res.status(500).json({ error: "Failed to analyze recipe" });
  }
});

// POST /veganize/commit
router.post("/commit", async (req, res) => {
  try {
    const { userId, userID, recipeText, recipe: recipeParam, substitutions, chosenSubs, originalPrompt } = req.body;
    const actualUserId = userId || userID; // Support both userId and userID
    const recipeContent = recipeText || recipeParam?.text || recipeParam; // Support recipeText, recipe.text, or recipe
    const subs = substitutions || chosenSubs; // Support both parameter names
    
    if (!recipeContent || !Array.isArray(subs)) {
      return res
        .status(400)
        .json({ error: "recipeText/recipe and substitutions/chosenSubs required" });
    }

    // userId is optional in commit route, but preferred if provided
    let user = null;
    if (actualUserId) {
      user = await User.findById(actualUserId).lean();
      if (!user) return res.status(404).json({ error: "User not found" });
    }

    const rewritten = await rewriteRecipeSteps(subs, recipeContent);

    // simple split of steps by line
    const steps = rewritten
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const substitutionMap = {};
    subs.forEach((s) => {
      if (s.original && s.substitute) {
        substitutionMap[s.original] = s.substitute;
      }
    });

    const savedRecipe = await Recipe.create({
      userId: actualUserId || null,
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
      id: savedRecipe._id.toString(),
      userId: savedRecipe.userId?.toString() || null,
      title: savedRecipe.title,
      tags: savedRecipe.tags,
      duration: savedRecipe.duration,
      ingredients: savedRecipe.ingredients,
      steps: savedRecipe.steps,
      previewImageUrl: savedRecipe.previewImageUrl,
      originalPrompt: savedRecipe.originalPrompt,
      type: savedRecipe.type,
      substitutionMap: savedRecipe.substitutionMap,
    };

    res.json({ adaptedRecipe });
  } catch (err) {
    console.error("veganize commit error:", err);
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

export default router;
