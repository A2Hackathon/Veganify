import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import User from "../models/User.js";
import { isAllowedForUser } from "../utils/llmClient.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const userID = req.query.userId || req.body.userID || req.body.userId;

        if (!req.file) {
            return res.status(400).json({ success: false, error: "Image is required" });
        }

        // Load user preferences
        const user = await User.findById(userID);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const userPrefs = {
            dietLevel: user.dietLevel,
            extraForbiddenTags: user.extraForbiddenTags || []
        };

        // OCR
        const ocrResult = await Tesseract.recognize(req.file.path, 'eng');
        let lines = ocrResult.data.lines.map(l => l.text.trim());

        // Clean each line
        lines = lines
            .map(line => line.replace(/[^a-zA-Z ]/g, "").trim())
            .filter(line => line.length > 0);

        // Check each line as a possible dish
        const results = [];

        console.log("🔍 Calling LLM (isAllowedForUser) for menu scan...");
        for (const line of lines) {
            const check = await isAllowedForUser(userPrefs, [line]);
            const first = check[0] || { allowed: "Ambiguous", reason: "" };

            results.push({
                ingredient: line,
                allowed: first.allowed,
                reason: first.reason || ""
            });
        }

        // Format for iOS MenuDish format
        const dishes = results.map(item => {
            let status = "suitable";
            if (item.allowed === "NotAllowed") {
                status = "not_suitable";
            } else if (item.allowed === "Ambiguous") {
                status = "modifiable";
            }
            return {
                name: item.ingredient,
                status: status, // "suitable" | "modifiable" | "not_suitable"
                modificationSuggestion: item.allowed !== "Allowed" ? (item.reason || "May need modifications") : null
            };
        });
        
        console.log("✅ LLM analyzed", results.length, "menu items");
        res.json({ dishes: dishes });

    } catch (err) {
        console.error("Error scanning menu:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

export default router;
