import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Recipe from "../models/Recipe.js";
import { generateRecipes } from "../utils/llmClient.js";
import { extractIngredients, rewriteRecipeSteps } from "../utils/llmClient.js";
import User from "../models/User.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// POST /recipes/generate
router.post("/generate", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get user's groceries to use as ingredients
    const Grocery = (await import("../models/grocery.js")).default;
    const groceries = await Grocery.find({ userID: userId });
    const ingredients = groceries.map(g => g.name);

    // Generate recipes
    const recipes = await generateRecipes(ingredients, 1);
    
    if (!recipes || recipes.length === 0) {
      return res.status(500).json({ error: "Failed to generate recipe" });
    }

    // Use first recipe
    const recipeText = recipes[0];

    // Save recipe
    const savedRecipe = await Recipe.create({
      userID: userId,
      recipe: [recipeText]
    });

    // Return in iOS Recipe format
    const recipe = {
      id: savedRecipe._id.toString(),
      title: "Generated Recipe",
      ingredients: [],
      instructions: recipeText,
      prepTime: 0,
      cookTime: 0,
      servings: 0
    };

    res.json(recipe);
  } catch (err) {
    console.error("Generate recipe error:", err);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
});

// POST /recipes/veganize
router.post("/veganize", async (req, res) => {
  try {
    const { userId, inputText } = req.body;

    if (!userId || !inputText) {
      return res.status(400).json({ error: "userId and inputText are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract ingredients
    const ingredients = await extractIngredients(inputText);

    // Get substitutions
    const substitutions = JSON.parse(readFileSync(join(__dirname, "../config/substitutions.json"), "utf-8"));

    const dietLevel = user.dietLevel?.toLowerCase() || "vegan";
    const adaptedIngredients = [];

    for (const ing of ingredients) {
      const key = ing.toUpperCase();
      const subs = substitutions[key]?.[dietLevel] || [];
      
      if (subs.length > 0) {
        adaptedIngredients.push({
          original: ing,
          substitute: subs[0] // Use first substitution
        });
      }
    }

    // Rewrite recipe
    const newRecipe = await rewriteRecipeSteps(adaptedIngredients, inputText);

    // Save recipe
    const savedRecipe = await Recipe.create({
      userID: userId,
      recipe: [newRecipe]
    });

    // Return in iOS Recipe format
    const recipe = {
      id: savedRecipe._id.toString(),
      title: "Veganized Recipe",
      ingredients: adaptedIngredients.map(item => item.substitute),
      instructions: newRecipe,
      prepTime: 0,
      cookTime: 0,
      servings: 0
    };

    res.json(recipe);
  } catch (err) {
    console.error("Veganize recipe error:", err);
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

// GET /recipes/saved?userId=...
router.get("/saved", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const recipes = await Recipe.find({ userID: userId });

    // Map to iOS Recipe format
    const savedRecipes = recipes.map(r => ({
      id: r._id.toString(),
      title: "Saved Recipe",
      ingredients: [],
      instructions: r.recipe.join("\n"),
      prepTime: 0,
      cookTime: 0,
      servings: 0
    }));

    res.json(savedRecipes);
  } catch (err) {
    console.error("Get saved recipes error:", err);
    res.status(500).json({ error: "Failed to get saved recipes" });
  }
});

// POST /recipes/save
router.post("/save", async (req, res) => {
  try {
    const { userId, recipe } = req.body;

    if (!userId || !recipe) {
      return res.status(400).json({ error: "userId and recipe are required" });
    }

    // Save recipe
    const savedRecipe = await Recipe.create({
      userID: userId,
      recipe: [recipe.instructions || recipe.text || ""]
    });

    // Return in iOS Recipe format
    const saved = {
      id: savedRecipe._id.toString(),
      title: recipe.title || "Saved Recipe",
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || recipe.text || "",
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      servings: recipe.servings || 0
    };

    res.json(saved);
  } catch (err) {
    console.error("Save recipe error:", err);
    res.status(500).json({ error: "Failed to save recipe" });
  }
});

export default router;

