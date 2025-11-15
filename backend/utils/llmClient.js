// utils/llmClient.js
const { TextServiceClient } = require('@google/generative-ai'); // Example SDK import
const client = new TextServiceClient({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Rewrite recipe steps using Gemini.
 * @param {Object} recipe - { title, ingredients, steps }
 * @returns {string} rewritten steps
 */
async function rewriteRecipeSteps(recipe) {
    const { title, ingredients, steps } = recipe;

    // Build a simple prompt for Gemini
    let substitutionsText = '';
    ingredients.forEach(ing => {
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

        return response?.text || steps; // fallback to original if no text returned
    } catch (err) {
        console.error('Gemini LLM error:', err);
        return steps; // fallback to original steps
    }
}

module.exports = { rewriteRecipeSteps };