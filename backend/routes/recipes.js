import express from "express";
import { RecipeStorage, UserStorage, GroceryItemStorage } from "../utils/jsonStorage.js";
import { generateRecipes, extractIngredients, rewriteRecipeSteps } from "../utils/llmClient.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseGenerationRequest, parseSaveRequest, parseAdaptationRequest } from "../utils/recipeInput.js";
import { parseIngredients } from "../utils/scanResults.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /recipes/generate
router.post("/generate", async (req, res) => {
  let input;
  try { input = parseGenerationRequest(req.body); }
  catch { return res.status(400).json({ error: "Provide a userId (1–128 characters), an optional prompt (up to 4000 characters), and at most 100 ingredient names (200 characters each, 8000 total)" }); }
  try {
    const { ingredients, prompt } = input;

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
    if (ingredientsList.length === 0) {
      const groceryItems = await GroceryItemStorage.find({ userId: user._id });
      ingredientsList = groceryItems.map(item => item.name);
    }

    if (ingredientsList.length === 0) {
      return res.status(400).json({ error: "No ingredients available. Please add items to your grocery list or provide ingredients." });
    }

    // Stored grocery names must obey the same inference bounds as supplied names.
    try { ingredientsList = parseIngredients({ ingredients: ingredientsList }); }
    catch { return res.status(400).json({ error: "Grocery ingredients exceed recipe generation limits or contain invalid names" }); }

    const generated = await generateRecipes(ingredientsList, 3, user);

    const stored = await RecipeStorage.createMany(generated.map(r => ({
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
    })));

    const saved = stored.map(recipe => ({
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
    }));

    res.json(saved);
  } catch {
    console.error("generate recipes error:");
    res.status(500).json({ error: "Failed to generate recipes" });
  }
});

// POST /recipes/save
router.post("/save", async (req, res) => {
  let input;
  try { input = parseSaveRequest(req.body); }
  catch { return res.status(400).json({ error: "Invalid recipe: provide a userId, title and bounded recipe fields with supported types" }); }
  try {
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

    const recipe = await RecipeStorage.create({ ...input, userId: user._id });

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
  } catch {
    console.error("save recipe error:");
    res.status(500).json({ error: "Failed to save recipe" });
  }
});

// POST /recipes/veganize (single-step veganization for iOS compatibility)
router.post("/veganize", async (req, res) => {
  let input;
  try { input = parseAdaptationRequest(req.body); }
  catch { return res.status(400).json({ error: "Provide a userId (1–128 characters) and recipe inputText (1–8000 characters)" }); }
  try {
    const { inputText } = input;

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
    const ingredients = await extractIngredients(inputText);

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
    const rewritten = await rewriteRecipeSteps(adaptedIngredients, inputText, user);

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
  } catch {
    console.error("veganize recipe error:");
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
  } catch {
    console.error("get saved recipes error:");
    res.status(500).json({ error: "Failed to load saved recipes" });
  }
});

export default router;
