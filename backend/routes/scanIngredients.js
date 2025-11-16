import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import User from "../models/User.js";
import { isAllowedForUser } from "../utils/llmClient.js";
import { mapIngredientStatus } from "../utils/eatingStyleMapper.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const userID = req.query.userId || req.body.userID || req.body.userId;
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Image is required" });
        }

        // Load user
        const user = await User.findById(userID);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        // OCR the image
        const ocrResult = await Tesseract.recognize(req.file.path, 'eng');
        const text = ocrResult.data.text;

        // Split text into ingredients
        const ingredients = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Call isAllowedForUser once on all ingredients
        console.log("🔍 Calling LLM (isAllowedForUser) for ingredients scan...");
        const checkResults = await isAllowedForUser(
            { dietLevel: user.dietLevel, extraForbiddenTags: user.extraForbiddenTags || [] },
            ingredients
        );
        console.log("✅ LLM returned results for", checkResults.length, "ingredients");

        // Format for iOS - map to IngredientClassification format
        const formattedIngredients = checkResults.map(r => ({
            name: r.ingredient || r.name || "",
            status: mapIngredientStatus(r.allowed), // Map to "allowed" | "ambiguous" | "not_allowed"
            reason: r.reason || "",
            suggestions: r.suggestions || []
        }));
        
        res.json({ 
            ingredients: formattedIngredients 
        });

    } catch (err) {
        console.error("Scan ingredients error:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// POST /scan/ingredients/text
router.post("/text", async (req, res) => {
    try {
        const { userId, ingredients } = req.body;

        if (!userId || !ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({ error: "userId and ingredients array are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Call isAllowedForUser on all ingredients
        console.log("🔍 Calling LLM (isAllowedForUser) for text ingredients analysis...");
        const checkResults = await isAllowedForUser(
            { dietLevel: user.dietLevel, extraForbiddenTags: user.extraForbiddenTags || [] },
            ingredients
        );
        console.log("✅ LLM returned results for", checkResults.length, "ingredients");

        // Format for iOS - map to IngredientClassification format
        const formattedIngredients = checkResults.map(r => ({
            name: r.ingredient || r.name || "",
            status: mapIngredientStatus(r.allowed), // Map to "allowed" | "ambiguous" | "not_allowed"
            reason: r.reason || "",
            suggestions: r.suggestions || []
        }));
        
        res.json({ 
            ingredients: formattedIngredients 
        });

    } catch (err) {
        console.error("Analyze ingredients text error:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// POST /scan/ingredients/alternative-product
router.post("/alternative-product", async (req, res) => {
    try {
        const { userId, productType, context } = req.body;

        if (!userId || !productType) {
            return res.status(400).json({ error: "userId and productType are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Use the analyze endpoint logic to get alternatives
        const { readFileSync } = await import("fs");
        const { fileURLToPath } = await import("url");
        const { dirname, join } = await import("path");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const substitutions = JSON.parse(readFileSync(join(__dirname, "../config/substitutions.json"), "utf-8"));

        const dietLevel = user.dietLevel?.toLowerCase() || "vegan";
        const key = productType.toUpperCase();
        const suggestions = substitutions[key]?.[dietLevel] || [];

        res.json({ suggestions });
    } catch (err) {
        console.error("Alternative product error:", err);
        res.status(500).json({ error: "Failed to get alternative products" });
    }
});

export default router;
