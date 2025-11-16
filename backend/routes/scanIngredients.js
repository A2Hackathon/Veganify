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
    if (!req.file) return res.status(400).json({ error: "image required" });

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

    // OCR processing
    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";

    // Extract ingredients
    const ingredients = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    const checks = await isAllowedForUser(prefs, ingredients);

    const formatted = checks.map((item) => ({
      name: item.ingredient,
      allowed: item.allowed || "Allowed",
      reason: item.reason || "",
      suggestions: item.suggestions || [],
    }));

    const allAllowed = formatted.every(item => item.allowed === "Allowed");
    
    res.json({
      success: true,
      isConsumable: allAllowed,
      ingredients: formatted,
    });
  } catch (err) {
    console.error("OCR ingredient scan error:", err);
    res.status(500).json({ error: "Failed to scan ingredients" });
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
    
    let ingredientsList;
    if (Array.isArray(ingredientsArray) && ingredientsArray.length > 0) {
      ingredientsList = ingredientsArray;
    } else if (text) {
      ingredientsList = text
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean);
    } else {
      return res.status(400).json({ error: "text or ingredients required" });
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

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    const checks = await isAllowedForUser(prefs, ingredientsList);

    const formatted = checks.map((item) => ({
      name: item.ingredient,
      allowed: item.allowed || "Allowed",
      reason: item.reason || "",
      suggestions: item.suggestions || [],
    }));

    const allAllowed = formatted.every(item => item.allowed === "Allowed");
    
    res.json({
      success: true,
      isConsumable: allAllowed,
      ingredients: formatted,
    });
  } catch (err) {
    console.error("Ingredient text analysis error:", err);
    res.status(500).json({ error: "Failed to analyze ingredient text" });
  }
});

export default router;
