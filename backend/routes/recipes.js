import express from "express";
import { RecipeStorage, UserStorage, GroceryItemStorage } from "../utils/jsonStorage.js";
import { generateRecipes, extractIngredients, rewriteRecipeSteps } from "../utils/llmClient.js";
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

    // If ingredients not provided, fetch from grocery list
    let ingredientsList = ingredients;
    if (!Array.isArray(ingredientsList) || ingredientsList.length === 0) {
      const groceryItems = await GroceryItemStorage.find({ userId: user._id });
      ingredientsList = groceryItems.map(item => item.name);
    }

    if (ingredientsList.length === 0) {
      return res.status(400).json({ error: "No ingredients available. Please add items to your grocery list or provide ingredients." });
    }

    const generated = await generateRecipes(ingredientsList, 3);

    const saved = [];
    for (const r of generated) {
      const recipe = await RecipeStorage.create({
        userId: user._id,
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
        id: recipe._id || recipe.id,
        userId: recipe.userId || user._id,
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
    let userId, title, tags, duration, ingredients, steps, previewImageUrl, originalPrompt, type, substitutionMap;
    
    if (recipeData.recipe) {
      const recipe = recipeData.recipe;
      userId = recipeData.userId;
      title = recipe.title;
      tags = recipe.tags;
      duration = recipe.duration;
      ingredients = recipe.ingredients;
      steps = recipe.steps;
      previewImageUrl = recipe.previewImageUrl;
      originalPrompt = recipe.originalPrompt;
      type = recipe.type;
      substitutionMap = recipe.substitutionMap;
    } else {
      userId = recipeData.userId;
      title = recipeData.title;
      tags = recipeData.tags;
      duration = recipeData.duration;
      ingredients = recipeData.ingredients;
      steps = recipeData.steps;
      previewImageUrl = recipeData.previewImageUrl;
      originalPrompt = recipeData.originalPrompt;
      type = recipeData.type;
      substitutionMap = recipeData.substitutionMap;
    }
    
    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title required" });
    }

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

    const recipe = await RecipeStorage.create({
      userId: user._id,
      title,
      tags: tags || [],
      duration: duration || "",
      ingredients: ingredients || [],
      steps: steps || [],
      previewImageUrl: previewImageUrl || "",
      originalPrompt: originalPrompt || "",
      type: type || "simplified",
      substitutionMap: substitutionMap || undefined,
    });

    res.json({
      id: recipe._id || recipe.id,
      userId: recipe.userId || user._id,
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

    // Extract ingredients
    console.log("?�� Calling LLM (extractIngredients) for recipe veganization...");
    const ingredients = await extractIngredients(inputText);
    console.log("??LLM extracted", ingredients.length, "ingredients");

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
    console.log("?�� Calling LLM (rewriteRecipeSteps) to veganize recipe...");
    const rewritten = await rewriteRecipeSteps(adaptedIngredients, inputText);
    console.log("??LLM rewrote recipe successfully");

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
    const recipe = await RecipeStorage.create({
      userId: user._id,
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
      id: recipe._id || recipe.id,
      userId: recipe.userId || user._id,
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

    const recipes = await RecipeStorage.find({ userId: user._id });

    const result = recipes.map((r) => ({
      id: r._id || r.id,
      userId: r.userId || user._id,
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
