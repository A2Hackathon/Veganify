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
    const { userId, recipeText } = req.body;
    if (!userId || !recipeText) {
      return res.status(400).json({ error: "userId and recipeText required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const ingredients = await extractIngredients(recipeText);

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
    const { userId, recipeText, substitutions, originalPrompt } = req.body;
    if (!userId || !recipeText || !Array.isArray(substitutions)) {
      return res
        .status(400)
        .json({ error: "userId, recipeText and substitutions required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const rewritten = await rewriteRecipeSteps(substitutions, recipeText);

    // simple split of steps by line
    const steps = rewritten
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const substitutionMap = {};
    substitutions.forEach((s) => {
      if (s.original && s.substitute) {
        substitutionMap[s.original] = s.substitute;
      }
    });

    const recipe = await Recipe.create({
      userId,
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
