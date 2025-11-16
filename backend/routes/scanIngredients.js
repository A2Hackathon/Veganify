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
        const checkResults = await isAllowedForUser(
            { dietLevel: user.dietLevel, extraForbiddenTags: user.extraForbiddenTags || [] },
            ingredients
        );

        // Format for iOS - map to expected format
        const formattedIngredients = checkResults.map(r => ({
            name: r.ingredient || r.name || "",
            allowed: r.allowed || "Allowed",
            reason: r.reason || r.reasons?.[0] || ""
        }));
        
        res.json({ 
            success: true, 
            isConsumable: checkResults.every(r => r.allowed === 'Allowed'),
            ingredients: formattedIngredients 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

export default router;
