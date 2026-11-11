// scanIngredients.js
import express from "express";
import { parseIngredients, scanResult } from "../utils/scanResults.js";
import { imageUpload } from "../utils/imageUpload.js";

// Preserve expected OCR failure statuses without trusting arbitrary exception values.
function scanFailureStatus(error) {
  return [400, 499, 502, 503, 504].includes(error?.status) ? error.status : 500;
}

export function createScanIngredientsRouter({ users, analyze, recognize }) {
const router = express.Router();

/*  
=========================================================
  POST /scan/ingredients  
  ??OCR image ??ingredient list ??classification
=========================================================
*/
router.post("/", imageUpload, async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "image required" });
    }

    // ALWAYS use the single Albert user
    let user = await users.findOne({ sproutName: "Albert" });
    if (!user) {
      user = await users.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const result = await recognize(req.file.buffer, { req, res });
    const text = result.data.text || "";

    let ingredients;
    try { ingredients = parseIngredients({ text }); }
    catch { return res.status(422).json({ success: false, isConsumable: false, ingredients: [], error: "No usable ingredient list was extracted" }); }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    let checks;
    try {
      checks = await analyze(prefs, ingredients);
    } catch {
      console.error("Ingredient analysis unavailable");
      checks = ingredients.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Analysis unavailable - please try again",
        suggestions: []
      }));
    }

    // Ensure we have valid checks
    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      console.warn("⚠️ No checks returned, creating fallback response");
      checks = ingredients.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Unable to analyze",
        suggestions: []
      }));
    }

    res.json(scanResult(ingredients, checks));
  } catch (err) {
    console.error("Ingredient image scan failed");
    res.status(scanFailureStatus(err)).json({
      success: false,
      isConsumable: false,
      ingredients: [],
      error: "Failed to scan ingredients"
    });
  }
});

/*  
=========================================================
  POST /scan/ingredients/text  
  ??Manual input text ??classification
=========================================================
*/
router.post("/text", async (req, res) => {
  try {
    let ingredientsList;
    try { ingredientsList = parseIngredients(req.body); }
    catch { return res.status(400).json({ success: false, isConsumable: false, ingredients: [], error: "Provide 1 to 100 ingredient names, at most 200 characters each and 8000 characters total" }); }

    // ALWAYS use the single Albert user
    let user = await users.findOne({ sproutName: "Albert" });
    if (!user) {
      user = await users.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    let checks;
    try {
      checks = await analyze(prefs, ingredientsList);
    } catch {
      console.error("Ingredient analysis unavailable");
      checks = ingredientsList.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Analysis unavailable",
        suggestions: []
      }));
    }

    // Ensure we have valid checks
    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      console.warn("⚠️ No checks returned, creating fallback response");
      checks = ingredientsList.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Unable to analyze",
        suggestions: []
      }));
    }

    res.json(scanResult(ingredientsList, checks));
  } catch (err) {
    console.error("Ingredient text scan failed");
    res.status(scanFailureStatus(err)).json({
      success: false,
      isConsumable: false,
      ingredients: [],
      error: "Failed to analyze ingredient text"
    });
  }
});

return router;
}

