// scanIngredients.js
import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import { UserStorage } from "../utils/jsonStorage.js";
import { isAllowedForUser } from "../utils/llmClient.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Helper to map allowed/ambiguous/not allowed
function mapStatus(s) {
  const val = (s || "").toLowerCase();
  if (val.includes("not")) return "not_allowed";
  if (val.includes("ambig")) return "ambiguous";
  return "allowed";
}

/*  
=========================================================
  POST /scan/ingredients  
  ??OCR image ??ingredient list ??classification
=========================================================
*/
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "image required" });
    }

    console.log(`📷 Processing image scan: ${req.file.path}`);

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      console.log("Creating Albert user for scan...");
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    console.log("🔍 Starting OCR processing...");
    // OCR processing
    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";
    console.log(`📝 OCR extracted text (${text.length} chars): ${text.substring(0, 200)}...`);

    if (!text || text.trim().length === 0) {
      console.warn("⚠️ No text extracted from image");
      return res.json({
        success: true,
        isConsumable: true,
        ingredients: [],
      });
    }

    // Extract ingredients
    const ingredients = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .filter(x => x.length > 0);
    
    console.log(`📋 Extracted ${ingredients.length} ingredients: ${ingredients.join(", ")}`);

    if (ingredients.length === 0) {
      console.warn("⚠️ No ingredients found after parsing");
      return res.json({
        success: true,
        isConsumable: true,
        ingredients: [],
      });
    }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    console.log(`🔍 Checking ingredients against diet: ${prefs.dietLevel}`);
    const checks = await isAllowedForUser(prefs, ingredients);
    console.log(`✅ Got ${checks.length} check results`);

    const formatted = checks.map((item) => ({
      name: item.ingredient || "",
      allowed: item.allowed || "Allowed",
      reason: item.reason || "",
      suggestions: Array.isArray(item.suggestions) ? item.suggestions : [],
    }));

    const allAllowed = formatted.every(item => item.allowed === "Allowed");
    
    console.log(`📊 Scan complete: ${formatted.length} ingredients, all allowed: ${allAllowed}`);
    
    res.json({
      success: true,
      isConsumable: allAllowed,
      ingredients: formatted,
    });
  } catch (err) {
    console.error("❌ OCR ingredient scan error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to scan ingredients",
      message: err.message 
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
    const { text, ingredients: ingredientsArray } = req.body;
    console.log(`📝 Text analysis request - text: ${text ? text.substring(0, 100) : "none"}, ingredients array: ${Array.isArray(ingredientsArray) ? ingredientsArray.length : "none"}`);
    
    let ingredientsList;
    if (Array.isArray(ingredientsArray) && ingredientsArray.length > 0) {
      ingredientsList = ingredientsArray;
      console.log(`📋 Using ingredients array: ${ingredientsList.join(", ")}`);
    } else if (text) {
      ingredientsList = text
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .filter(x => x.length > 0);
      console.log(`📋 Parsed ingredients from text: ${ingredientsList.join(", ")}`);
    } else {
      console.error("❌ No text or ingredients provided");
      return res.status(400).json({ error: "text or ingredients required" });
    }

    if (ingredientsList.length === 0) {
      console.warn("⚠️ No ingredients found after parsing");
      return res.json({
        success: true,
        isConsumable: true,
        ingredients: [],
      });
    }

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      console.log("Creating Albert user for text analysis...");
      user = await UserStorage.create({
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
    const checks = await isAllowedForUser(prefs, ingredientsList);
    console.log(`✅ Got ${checks.length} check results`);

    const formatted = checks.map((item) => ({
      name: item.ingredient || "",
      allowed: item.allowed || "Allowed",
      reason: item.reason || "",
      suggestions: Array.isArray(item.suggestions) ? item.suggestions : [],
    }));

    const allAllowed = formatted.every(item => item.allowed === "Allowed");
    
    console.log(`📊 Text analysis complete: ${formatted.length} ingredients, all allowed: ${allAllowed}`);
    
    res.json({
      success: true,
      isConsumable: allAllowed,
      ingredients: formatted,
    });
  } catch (err) {
    console.error("❌ Ingredient text analysis error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to analyze ingredient text",
      message: err.message 
    });
  }
});

export default router;
