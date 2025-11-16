// scanIngredients.js
import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import User from "../models/User.js";
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
  → OCR image → ingredient list → classification
=========================================================
*/
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) return res.status(400).json({ error: "image required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

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
      status: mapStatus(item.allowed),
      reason: item.reason || "",
      suggestions: item.suggestions || [],
    }));

    res.json({ ingredients: formatted });
  } catch (err) {
    console.error("OCR ingredient scan error:", err);
    res.status(500).json({ error: "Failed to scan ingredients" });
  }
});

/*  
=========================================================
  POST /scan/ingredients/text  
  → Manual input text → classification
=========================================================
*/
router.post("/text", async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: "userId and text required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

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
      status: mapStatus(item.allowed),
      reason: item.reason || "",
      suggestions: item.suggestions || [],
    }));

    res.json({ ingredients: formatted });
  } catch (err) {
    console.error("Ingredient text analysis error:", err);
    res.status(500).json({ error: "Failed to analyze ingredient text" });
  }
});

export default router;
