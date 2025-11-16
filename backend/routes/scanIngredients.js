import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import User from "../models/User.js";
import { isAllowedForUser } from "../utils/llmClient.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

function mapStatus(s) {
  const v = (s || "").toLowerCase();
  if (v.includes("not")) return "not_allowed";
  if (v.includes("ambig")) return "ambiguous";
  return "allowed";
}

// POST /scan/ingredients (image OCR)
router.post("/ingredients", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) {
      return res.status(400).json({ error: "image required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";

    const ingredients = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    const checks = await isAllowedForUser(prefs, ingredients);

    const classifications = checks.map((c) => ({
      name: c.ingredient,
      status: mapStatus(c.allowed),
      reason: c.reason || "",
      suggestions: c.suggestions || [],
    }));

    res.json({ ingredients: classifications });
  } catch (err) {
    console.error("scan ingredients error:", err);
    res.status(500).json({ error: "Failed to scan ingredients" });
  }
});

// POST /scan/ingredients/text
router.post("/ingredients/text", async (req, res) => {
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

    const classifications = checks.map((c) => ({
      name: c.ingredient,
      status: mapStatus(c.allowed),
      reason: c.reason || "",
      suggestions: c.suggestions || [],
    }));

    res.json({ ingredients: classifications });
  } catch (err) {
    console.error("scan ingredients text error:", err);
    res.status(500).json({ error: "Failed to analyze ingredients text" });
  }
});

// POST /scan/alternative-product
router.post("/alternative-product", async (req, res) => {
  try {
    const { userId, productType, context } = req.body;
    if (!userId || !productType) {
      return res
        .status(400)
        .json({ error: "userId and productType required" });
    }

    // For now, just respond with some placeholder suggestions depending on dietLevel
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const diet = (user.dietLevel || "vegan").toLowerCase();

    let suggestions = [];
    if (productType.toLowerCase().includes("milk")) {
      suggestions = ["Oat milk", "Soy milk", "Almond milk"];
    } else if (productType.toLowerCase().includes("butter")) {
      suggestions = ["Vegan butter", "Olive oil"];
    } else {
      suggestions = ["Vegan-friendly alternative", "Plant-based version"];
    }

    res.json({ suggestions });
  } catch (err) {
    console.error("alternative-product error:", err);
    res.status(500).json({ error: "Failed to get alternative products" });
  }
});

export default router;
