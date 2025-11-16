const express = require('express');
const router = express.Router();

const substitutions = require('../config/substitutions.json');
const { rewriteRecipeSteps } = require('../utils/llmClient');
const llm = require("../utils/llmClient");

// note: the POST request includes userID => uses it to look up that specific user in models/User

router.post('/', async (req, res) => {
    try {
        const { userID, recipe, createdAt } = req.body;

        if (!recipe) {
            return res.status(400).json({
                success: false,
                error: "Recipe with ingredients and steps is required"
            });
        }


        const user = await User.findById(userID);
        userPrefs = {
            dietLevel: user.dietLevel,
            extraForbiddenTags: user.extraForbiddenTags || [],
        }
        
        if (!dietLevel) {
            return res.status(400).json({
                success: false,
                error: "dietLevel is required"
            });
        }

        const level = userPrefs[dietLevel].toLowerCase();
        const adaptedIngredients = [];
        let dietFriendly = true;

        const ingredients = await llm.extractIngredients(recipeText);

        // Process ingredients 
        for (const ing of ingredients) {
            const subs = substitutions[ing.toUpperCase()]?.[level] || [];
            const options = subs.length > 0 ? subs : [ing];

            // Check diet compatibility
            if (subs.length === 0 && (level != 'flexitarian')) {
                dietFriendly = false;
            }

            adaptedIngredients.push({
                original: ing,
                options
            });
        }

        //  Rewrite steps 
        let newSteps = recipe;
        if (typeof rewriteRecipeSteps === 'function') {
            const rewritten = await rewriteRecipe({
                title: recipe.title,
                ingredients: adaptedIngredients,
                steps: recipe
            });
            if (rewritten) newSteps = rewritten;
        }

        // Send response 
        res.json({
            success: true,
            originalRecipe: recipe,
            adaptedRecipe: {
                ingredients: adaptedIngredients,
                steps: newSteps,
                dietFriendly
            },
        });

    } catch (err) {
        console.error("Error veganizing recipe:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

module.exports = router;
