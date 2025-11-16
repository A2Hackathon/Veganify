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

        // Return the results
        res.json({ success: true, 
            isConsumable: checkResults.every(r => r.allowed === 'Allowed'),
            ingredients: checkResults 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

module.exports = router;
