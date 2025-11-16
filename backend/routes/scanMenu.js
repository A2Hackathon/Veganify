const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');

const menuParser = require('../utils/menuParser');
const Ingredient = require('../models/Ingredient');
const User = require('../models/User');
const {rewriteRecipeSteps,
    extractIngredients,
    isAllowedForUser} = require('../utils/llmClient');

const upload = multer({ dest: 'uploads/' }); // temp folder for uploaded images


router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { userID, menuText, dietLevel, extraForbiddenTags = [] } = req.body;

        let textToParse = menuText;

        // OCR
        if (req.file) {
            const imagePath = req.file.path;
            try {
                const ocrResult = await Tesseract.recognize(imagePath, 'eng');
                textToParse = ocrResult.data.text;
            } catch (ocrErr) {
                console.error('OCR failed:', ocrErr);
                return res.status(500).json({ success: false, error: "OCR failed" });
            } 
        }

        if (!textToParse) {
            return res.status(400).json({ success: false, error: "No menu text found" });
        }

        // Load user preferences
        let userPrefs = { dietLevel, extraForbiddenTags };
        const user = await User.findById(userID);
        
        userPrefs = {
                    dietLevel: user.dietLevel,
                    extraForbiddenTags: user.extraForbiddenTags || [],
                };
            
        

        // Parse menu text into dishes + ingredients
        const parsedMenu = menuParser(textToParse);
        const ingredientDetails = [];

        for (const item of parsedMenu) {

            for (const ingredient of item.ingredients) {

                const check = isAllowedForUser(userPrefs, tags);

                ingredientDetails.push({
                    ingredient: ingredient,
                    allowed: check.allowed,
                    reasons: check.reasons,
                });
            }

            results.push({
                item: item.name,
                ingredients: ingredientDetails,
                compatible: ingredientDetails.every(i => i.allowed)
            });
        }

        res.json({ success: true, items: results });

    } catch (err) {
        console.error("Error scanning menu:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

module.exports = router;
