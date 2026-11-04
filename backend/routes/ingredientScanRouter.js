// scanIngredients.js
import express from "express";
import { parseIngredients, scanResult } from "../utils/scanResults.js";
import { imageUpload } from "../utils/imageUpload.js";

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

    console.log("Processing ingredient image");

    // ALWAYS use the single Albert user
    let user = await users.findOne({ sproutName: "Albert" });
    if (!user) {
      console.log("Creating Albert user for scan...");
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
    console.log(`📝 OCR extracted text (${text.length} chars): ${text.substring(0, 200)}...`);

    let ingredients;
    try { ingredients = parseIngredients({ text }); }
    catch { return res.status(422).json({ success: false, isConsumable: false, ingredients: [], error: "No usable ingredient list was extracted" }); }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    console.log(`🔍 Checking ingredients against diet: ${prefs.dietLevel}`);
    let checks;
    try {
      checks = await analyze(prefs, ingredients);
      console.log(`✅ Got ${checks.length} check results`);
    } catch (llmError) {
      console.error("❌ LLM API error:", llmError);
      console.error("LLM Error details:", {
        name: llmError?.name,
        message: llmError?.message,
        stack: llmError?.stack
      });
      console.error("⚠️ isAllowedForUser should not throw - using fallback");
      // isAllowedForUser should always return a result (even fallback), so this shouldn't happen
      // But if it does, return a basic response instead of throwing
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
    console.error("❌ OCR ingredient scan error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error stack:", err.stack);
    
    // Check for connection-related errors
    if (err.message && err.message.includes("connection")) {
      console.error("⚠️ Connection error detected - this might be a Tesseract worker issue");
      console.error("💡 Try: Restart the server or check if port conflicts exist");
    }
    
    // Preserve the response shape while reporting processing failures.
    res.status(err.status || 500).json({
      success: false,
      isConsumable: false,
      ingredients: [],
      error: err.message || "Failed to scan ingredients"
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
      console.log("Creating Albert user for text analysis...");
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

    console.log(`🔍 Checking ${ingredientsList.length} ingredients against diet: ${prefs.dietLevel}`);
    let checks;
    try {
      checks = await analyze(prefs, ingredientsList);
      console.log(`✅ Got ${checks.length} check results`);
    } catch (llmError) {
      console.error("❌ LLM API error:", llmError);
      console.error("LLM Error details:", {
        name: llmError?.name,
        message: llmError?.message,
        stack: llmError?.stack
      });
      console.error("⚠️ isAllowedForUser should not throw - this is unexpected");
      // isAllowedForUser should always return a result (even fallback), so this shouldn't happen
      // But if it does, return a basic response
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
    console.error("❌ Ingredient text analysis error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Preserve the response shape while reporting processing failures.
    res.status(err.status || 500).json({
      success: false,
      isConsumable: false,
      ingredients: [],
      error: err.message || "Failed to analyze ingredient text"
    });
  }
});

return router;
}

