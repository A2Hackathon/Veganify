const express = require('express');
const router = express.Router();

const substitutions = require('../config/substitutions.json');
const impactFactors = require('../config/impactFactors.json');
const { rewriteRecipeSteps } = require('../utils/llmClient');

// note: the POST request includes userID => uses it to look up that specific user in models/User

router.post('/', async (req, res) => {
    try {
        const { recipe, dietLevel } = req.body;

        if (!recipe || !recipe.ingredients || !recipe.steps) {
            return res.status(400).json({
                success: false,
                error: "Recipe with ingredients and steps is required"
            });
        }

        if (!dietLevel) {
            return res.status(400).json({
                success: false,
                error: "dietLevel is required"
            });
        }

        const level = dietLevel.toLowerCase();
        const adaptedIngredients = [];
        let dietFriendly = true;

        // Process ingredients 
        for (const ing of recipe.ingredients) {
            const subs = substitutions[ing.toUpperCase()]?.[level] || [];
            const options = subs.length > 0 ? subs : [ing];

            // Check diet compatibility
            if (subs.length === 0 && (level === 'vegan' || level === 'vegetarian')) {
                dietFriendly = false;
            }

            adaptedIngredients.push({
                original: ing,
                options
            });
        }

        //  Rewrite steps 
        let newSteps = recipe.steps;
        if (typeof rewriteRecipeSteps === 'function') {
            const rewritten = await rewriteRecipe({
                title: recipe.title,
                ingredients: adaptedIngredients,
                steps: recipe.steps
            });
            if (rewritten) newSteps = rewritten;
        }

        // Our current impactFactors contain placeholder values for certain categories
        let co2Saved = 0;
        let waterSaved = 0;
        let animalsSaved = 0;

        adaptedIngredients.forEach(ing => {
            const original = ing.original.toUpperCase();

            if (original !== adaptedIngredients && impactFactors[original]) {
                co2Saved += impactFactors[original].co2;
                waterSaved += impactFactors[original].water;
                animalsSaved += impactFactors[original].animals;
            }
            
        });

        const impactDelta = {
            co2_saved: co2Saved,
            water_saved: waterSaved,
            animals_saved: animalsSaved
        };

        // Send response 
        res.json({
            success: true,
            originalRecipe: recipe,
            adaptedRecipe: {
                title: recipe.title + " (Adapted)",
                ingredients: adaptedIngredients,
                steps: newSteps,
                dietFriendly
            },
            impactDelta
        });

    } catch (err) {
        console.error("Error veganizing recipe:", err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

module.exports = router;
