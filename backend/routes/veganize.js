import express from "express";
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
  try {
    const { userId, userID, recipeText, recipe } = req.body;
    const actualUserId = userId || userID; // Support both userId and userID
    const recipeContent = recipeText || recipe; // Support both parameter names
    if (!actualUserId || !recipeContent) {
      return res.status(400).json({ error: "userId/userID and recipeText/recipe required" });
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

    console.log(`📝 Analyzing recipe content (${recipeContent.length} chars)...`);
    const ingredients = await extractIngredients(recipeContent);
    console.log(`📋 Extracted ${ingredients.length} ingredients from recipe`);

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };
    
    console.log(`🔍 Checking ingredients against diet: ${prefs.dietLevel}, restrictions: ${prefs.extraForbiddenTags.join(", ") || "none"}`);

    const checks = await isAllowedForUser(prefs, ingredients);
    console.log(`🔍 Analyzed ${ingredients.length} ingredients, got ${checks.length} checks`);
    
    // Log all checks for debugging
    checks.forEach(check => {
      console.log(`  - ${check.ingredient}: ${check.allowed} (${check.reason})`);
    });

    // Load substitutions config for suggestions
    const substitutions = JSON.parse(readFileSync(join(__dirname, "../config/substitutions.json"), "utf-8"));
    const dietLevel = user.dietLevel?.toLowerCase() || "vegan";

    const problematic = checks
      .filter((c) => {
        const isProblematic = c.allowed !== "Allowed";
        if (isProblematic) {
          console.log(`⚠️ Problematic ingredient found: ${c.ingredient} (${c.allowed})`);
        }
        return isProblematic;
      })
      .map((c) => {
        // Get suggestions from LLM response first
        let suggestions = Array.isArray(c.suggestions) ? c.suggestions : [];
        
        // If no suggestions from LLM, try to get from substitutions config
        if (suggestions.length === 0) {
          const ingredientKey = c.ingredient.toUpperCase();
          if (substitutions[ingredientKey]?.[dietLevel]) {
            suggestions = substitutions[ingredientKey][dietLevel];
            console.log(`📋 Using substitution config for ${c.ingredient}: ${suggestions.join(", ")}`);
          }
        }
        
        console.log(`✅ Returning problematic ingredient: ${c.ingredient} with ${suggestions.length} suggestions`);
        
        return {
          original: c.ingredient,
          suggestions: suggestions,
        };
      });

    console.log(`📊 Total problematic ingredients: ${problematic.length}`);
    console.log(`📋 Problematic ingredients: ${problematic.map(p => p.original).join(", ")}`);

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
      if (actualUserId === "ALBERT_SHARED_USER") {
        user = await UserStorage.findOne({ sproutName: "Albert" });
        if (!user) return res.status(404).json({ error: "Albert user not found" });
      } else {
        user = await UserStorage.findById(actualUserId);
        if (!user) return res.status(404).json({ error: "User not found" });
      }
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
  } catch (err) {
    console.error("veganize commit error:", err);
    res.status(500).json({ error: "Failed to veganize recipe" });
  }
});

export default router;
