const express = require('express');
const router = express.Router();

const substitutions = require('../config/substitutions.json');
const User = require('../models/User');
const { extractIngredients, rewriteRecipeSteps } = require("../utils/llmClient");

// Step 1: Analyze ingredients only
router.post('/analyze', async (req, res) => {
    try {
        const { userID, recipe } = req.body;

        if (!recipe) {
            return res.status(400).json({
                success: false,
                error: "Recipe text is required"
            });
        }

        const user = await User.findById(userID);
        const dietLevel = user.dietLevel?.toLowerCase();
        const extraForbiddenTags = user.extraForbiddenTags || [];

        const ingredients = await extractIngredients(recipe);

        const problems = []; 

        for (const ing of ingredients) {
            const key = ing.toUpperCase();
            const subs = substitutions[key]?.[dietLevel] || [];

            const violatesDiet =
                // No substitution available AND user is restrictive
                (subs.length === 0 && dietLevel !== "flexitarian") ||
                // Ingredient contains user forbidden tags
                extraForbiddenTags.some(tag => ing.toLowerCase().includes(tag.toLowerCase()));

            if (violatesDiet) {
                problems.push({
                    original: ing,
                    suggestions: subs   // ⬅️ MULTIPLE substitutions returned
                });
            }
        }

        res.json({
            success: true,
            violatesCount: problems.length,
            problematicIngredients: problems
        });

    } catch (err) {
        console.error("Analyze error:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


// Step 2: Apply user-selected substitutes & rewrite recipe
router.post('/commit', async (req, res) => {
    try {
        const { recipe, chosenSubs } = req.body;

        if (!recipe?.text || !chosenSubs) {
            return res.status(400).json({
                success: false,
                error: "recipe.text and chosenSubs are required"
            });
        }

        const adaptedIngredients = chosenSubs.map(item => ({
            original: item.original,
            substitute: item.substitute
        }));

        const newRecipe = await llm.rewriteRecipeSteps(adaptedIngredients, recipe.text);

        res.json({
            success: true,
            adaptedRecipe: {
                ingredients: adaptedIngredients,
                text: newRecipe
            }
        });


    } catch (err) {
        console.error("Commit error:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});
