import express from "express";
import User from "../models/User.js";
import Recipe from "../models/Recipe.js";
import { extractIngredients, rewriteRecipeSteps, isAllowedForUser } from "../utils/llmClient.js";

const router = express.Router();

function mapStatus(s) {
  const v = (s || "").toLowerCase();
  if (v.includes("not")) return "not_allowed";
  if (v.includes("ambig")) return "ambiguous";
  return "allowed";
}

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

    const problematic = checks
      .filter((c) => c.allowed !== "Allowed")
      .map((c) => ({
        name: c.ingredient,
        status: mapStatus(c.allowed),
        reason: c.reason || "",
        suggestions: c.suggestions || [],
      }));

    res.json({
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
    const { userId, userID, recipeText, recipe, substitutions, chosenSubs, originalPrompt } = req.body;
    const actualUserId = userId || userID; // Support both userId and userID
    const recipeContent = recipeText || recipe?.text || recipe; // Support recipeText, recipe.text, or recipe
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

    const recipe = await Recipe.create({
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
      id: recipe._id.toString(),
      userId: recipe.userId?.toString() || null,
      title: recipe.title,
      tags: recipe.tags,
      duration: recipe.duration,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      previewImageUrl: recipe.previewImageUrl,
      originalPrompt: recipe.originalPrompt,
      type: recipe.type,
      substitutionMap: recipe.substitutionMap,
    };

    res.json({ adaptedRecipe });
  } catch (err) {
    console.error("veganize commit error:", err);
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

export default router;
