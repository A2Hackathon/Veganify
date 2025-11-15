// utils/llmClient.js
// Note: this file assumes @google/generative-ai exports TextServiceClient
const { TextServiceClient } = require('@google/generative-ai'); // Example SDK import
const client = new TextServiceClient({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Rewrite recipe steps using Gemini.
 * @param {Object} recipe - { title, ingredients, steps }
 * @returns {string} rewritten steps
 */
async function rewriteRecipeSteps(recipe) {
    const { title, ingredients, steps } = recipe;

    // Build a simple prompt for Gemini (kept exactly as you wrote it)
    let substitutionsText = '';
    (ingredients || []).forEach(ing => {
        if (ing.options && ing.options.length > 0) {
            substitutionsText += `Replace "${ing.original}" with "${ing.options[0]}".\n`;
        }
    });

    const prompt = `
You are a helpful assistant that rewrites recipe steps.
Recipe: "${title}"
Original steps: "${steps}"

Instructions:
${substitutionsText}

Rewrite the recipe steps incorporating the substitutions naturally.
`;

    try {
        const response = await client.generateText({
            model: 'gemini-text-1', // or your chosen Gemini model
            input: prompt,
        });

        // Defensive extraction: SDKs may structure the response differently across versions.
        // Use whichever property exists; fall back to original steps.
        const text =
            // new-style field sometimes
            (response && (response.text || response.output?.[0]?.content?.[0]?.text)) ||
            // older/alternative shapes
            (response && (response.candidates?.[0]?.content || response.result?.candidates?.[0]?.content)) ||
            '';

        // If it's an object/array, coerce to string
        if (typeof text === 'string' && text.trim().length > 0) {
            return text;
        } else if (Array.isArray(text)) {
            return text.join('\n');
        } else if (text && typeof text === 'object') {
            try {
                return JSON.stringify(text);
            } catch {
                return steps;
            }
        }

        return steps; // fallback
    } catch (err) {
        console.error('Gemini LLM error:', err);
        return steps; // fallback to original steps
    }
}

/**
 * Extract ingredients from a recipe text using Gemini.
 * Returns an array of ingredient strings (one per line in LLM output).
 *
 * NOTE: prompt text preserved exactly as provided.
 */
async function extractIngredients(recipeText) {
    const prompt = `
Extract ALL ingredients used in the following recipe.
Ingredients may appear in a list OR inside the steps.

Return ONLY a plain list, one ingredient per line.
No numbering. No explanations. No extra text.

Recipe:
"""
${recipeText}
"""

Example output:
tomato
olive oil
salt
garlic
`;

    try {
        const response = await client.generateText({
            model: 'gemini-2.0-flash',
            input: prompt,
        });

        // Defensive extraction (see above)
        const text =
            (response && (response.text || response.output?.[0]?.content?.[0]?.text)) ||
            (response && (response.candidates?.[0]?.content || response.result?.candidates?.[0]?.content)) ||
            '';

        let raw = '';
        if (typeof text === 'string') raw = text;
        else if (Array.isArray(text)) raw = text.join('\n');
        else if (text && typeof text === 'object') raw = JSON.stringify(text);

        // Split into a list of strings (one ingredient per non-empty trimmed line)
        const ingredients = raw
            .split('\n')
            .map(i => i.replace(/^[\d\.\-\)\s]+/, '').trim()) // remove numbering/bullets if any
            .filter(i => i.length > 0);

        return ingredients;
    } catch (err) {
        console.error('Gemini extractIngredients error:', err);
        return []; // fallback to empty list
    }
}

module.exports = {
    rewriteRecipeSteps,
    extractIngredients
};
