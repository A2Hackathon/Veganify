const express = require('express');
const router = express.Router();

const menuParser = require('../utils/menuParser');       
const isAllowedForUser = require('../utils/isAllowedForUser');  
const Ingredient = require('../models/Ingredient');     
const User = require('../models/User');                 

// POST /scan/menu
router.post('/', async (req, res) => {
    try {
        const { userId, menuText } = req.body;

        // Check for required input
        if (!menuText) {
            return res.status(400).json({
                success: false,
                error: "menuText is required"
            });
        }

        // Get user dietary restrictions if provided
        let user = null;
        if (userId) {
            user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found"
                });
            }
        }

        // Parse the raw menu text into an array of dishes
        const parsedMenu = menuParser(menuText); 

        const results = [];

        for (const item of parsedMenu) {
            const ingredientDetails = [];

            for (const ing of item.ingredients) {
                // Look up ingredient in DB
                let dbIng = await Ingredient.findOne({ name: new RegExp(`^${ing}$`, 'i') });

                let allowed = true;
                if (user) {
                    allowed = isAllowedForUser(user.dietLevel, ing);
                }

                ingredientDetails.push({
                    ingredient: ing,
                    allowed,
                    info: dbIng || null
                });
            }

            const menuItemResult = {
                item: item.name,
                ingredients: ingredientDetails,
                compatible: ingredientDetails.every(function(ingredientObject) {
                    return ingredientObject.allowed;
                })
            };

            results.push(menuItemResult);
        }

        // Return the processed results
        res.json({
            success: true,
            items: results
        });

    } catch (err) {
        console.error("Error scanning menu:", err);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});

module.exports = router;
