const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');

const User = require('../models/User');
const { isAllowedForUser } = require('../utils/llmClient');

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { userID } = req.body;

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

        // Check each line as a possible ingredient 
        const results = [];

        for (const line of lines) {

            const check = await isAllowedForUser(userPrefs, [line]);

            results.push({
                ingredient: line,
                allowed: check.allowed,
                reasons: check.reasons
            });
        }

        res.json({ success: true, items: results });

    } catch (err) {
        console.error("Error scanning menu:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

module.exports = router;
