import express from "express";
import Recipe from "../models/Recipe.js";
import User from "../models/User.js";
import { generateRecipes, extractIngredients, rewriteRecipeSteps } from "../utils/llmClient.js";
import { toObjectId } from "../utils/objectIdHelper.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /recipes/generate
router.post("/generate", async (req, res) => {
  try {
    const { userId, ingredients, prompt } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const userObjectId = toObjectId(userId);
    const user = await User.findById(userObjectId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // If ingredients not provided, fetch from grocery list
    let ingredientsList = ingredients;
    if (!Array.isArray(ingredientsList) || ingredientsList.length === 0) {
      const GroceryItem = (await import("../models/GroceryItem.js")).default;
      const groceryItems = await GroceryItem.find({ userId: userObjectId }).lean();
      ingredientsList = groceryItems.map(item => item.name);
    }

    if (ingredientsList.length === 0) {
      return res.status(400).json({ error: "No ingredients available. Please add items to your grocery list or provide ingredients." });
    }

    const generated = await generateRecipes(ingredientsList, 3);

    const saved = [];
    for (const r of generated) {
      const recipe = await Recipe.create({
        userId: userObjectId,
        title: r.title || "Untitled",
        tags: r.tags || [],
        duration: r.duration || "",
        ingredients:
          (r.ingredients || []).map((i) => ({
            name: i.name,
            amount: i.amount || "",
            unit: i.unit || "",
          })) || [],
        steps: r.steps || [],
        previewImageUrl: r.previewImageUrl || "",
        originalPrompt: prompt || "",
        type: "simplified",
        substitutionMap: undefined,
      });

      saved.push({
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
        substitutionMap: recipe.substitutionMap || null,
      });
    }

    res.json(saved);
  } catch (err) {
    console.error("generate recipes error:", err);
    res.status(500).json({ error: "Failed to generate recipes" });
  }
});

// POST /recipes/save
router.post("/save", async (req, res) => {
  try {
    const recipeData = req.body;
    const { userId, title } = recipeData;
    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

    const userObjectId = toObjectId(userId);
    const recipe = await Recipe.create({
      userId: userObjectId,
      title,
      tags: recipeData.tags || [],
      duration: recipeData.duration || "",
      ingredients: recipeData.ingredients || [],
      steps: recipeData.steps || [],
      previewImageUrl: recipeData.previewImageUrl || "",
      originalPrompt: recipeData.originalPrompt || "",
      type: recipeData.type || "simplified",
      substitutionMap: recipeData.substitutionMap || undefined,
    });

    res.json({
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
      substitutionMap: recipe.substitutionMap || null,
    });
  } catch (err) {
    console.error("save recipe error:", err);
    res.status(500).json({ error: "Failed to save recipe" });
  }
});

// POST /recipes/veganize (single-step veganization for iOS compatibility)
router.post("/veganize", async (req, res) => {
  try {
    const { userId, inputText } = req.body;
    if (!userId || !inputText) {
      return res.status(400).json({ error: "userId and inputText required" });
    }

    const userObjectId = toObjectId(userId);
    const user = await User.findById(userObjectId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Extract ingredients
    console.log("🔍 Calling LLM (extractIngredients) for recipe veganization...");
    const ingredients = await extractIngredients(inputText);
    console.log("✅ LLM extracted", ingredients.length, "ingredients");

    // Get substitutions
    const substitutions = JSON.parse(readFileSync(join(__dirname, "../config/substitutions.json"), "utf-8"));
    const dietLevel = user.dietLevel?.toLowerCase() || "vegan";
    const adaptedIngredients = [];
    const substitutionMap = {};

    for (const ing of ingredients) {
      const key = ing.toUpperCase();
      const subs = substitutions[key]?.[dietLevel] || [];
      if (subs.length > 0) {
        adaptedIngredients.push({
          original: ing,
          substitute: subs[0]
        });
        substitutionMap[ing] = subs[0];
      }
    }

    // Rewrite recipe
    console.log("🔍 Calling LLM (rewriteRecipeSteps) to veganize recipe...");
    const rewritten = await rewriteRecipeSteps(adaptedIngredients, inputText);
    console.log("✅ LLM rewrote recipe successfully");

    // Convert to steps array
    const steps = rewritten
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !s.match(/^(recipe|ingredients|instructions|method|steps?):?$/i));
    const finalSteps = steps.length > 0 ? steps : [rewritten];

    // Map ingredients to RecipeIngredient format
    const recipeIngredients = adaptedIngredients.map(item => ({
      name: item.substitute,
      amount: null,
      unit: null
    }));

    // Save recipe
    const recipe = await Recipe.create({
      userId: userObjectId,
      title: "Veganized Recipe",
      tags: ["veganized"],
      duration: "30 min",
      ingredients: recipeIngredients,
      steps: finalSteps,
      previewImageUrl: "",
      originalPrompt: inputText,
      type: "veganized",
      substitutionMap,
    });

    const result = {
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
      substitutionMap: recipe.substitutionMap || null,
    };

    res.json(result);
  } catch (err) {
    console.error("veganize recipe error:", err);
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

// GET /recipes/saved?userId=...
router.get("/saved", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const userObjectId = toObjectId(userId);
    const recipes = await Recipe.find({ userId: userObjectId }).lean();

    const result = recipes.map((r) => ({
      id: r._id.toString(),
      userId: r.userId?.toString() || null,
      title: r.title,
      tags: r.tags || [],
      duration: r.duration || "",
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      previewImageUrl: r.previewImageUrl || "",
      originalPrompt: r.originalPrompt || null,
      type: r.type || "simplified",
      substitutionMap: r.substitutionMap || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("get saved recipes error:", err);
    res.status(500).json({ error: "Failed to load saved recipes" });
  }
});

export default router;
