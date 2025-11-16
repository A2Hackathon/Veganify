const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//
// Extract ingredients
//
async function extractIngredients(recipeText) {
    const prompt = `
Extract ALL ingredients from the recipe below.
Return only a list with one ingredient per line.
No numbering, no extra text.

Recipe:
"""
${recipeText}
"""
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return text
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
    } catch (err) {
        console.error("extractIngredients error:", err);
        return [];
    }
}

//
// Rewrite recipe steps
//
async function rewriteRecipeSteps(subs, originalRecipe) {
    let instructions = "";
    subs.forEach(s => {
        if (s.substitute)
            instructions += `Replace "${s.original}" with "${s.substitute}".\n`;
    });

    const prompt = `
Rewrite the following recipe to incorporate the listed substitutions.

Substitutions:
${instructions}

Original Recipe:
"""
${originalRecipe}
"""

Return ONLY the rewritten recipe text.
`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("rewriteRecipeSteps error:", err);
        return originalRecipe;
    }
}



/**
 * Check if ingredients are allowed for a user
 * @param {Object} userPrefs { dietLevel: string, extraForbiddenTags: [string] }
 * @param {string[]} ingredientTags
 * @returns {Object} { allowed: boolean, reasons: [string] }
 */
async function isAllowedForUser(userPrefs, ingredientTags) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        You are a dietary compliance assistant.
        User dietary preferences:
        Diet Level: ${userPrefs.dietLevel}
        Extra Forbidden Tags: ${userPrefs.extraForbiddenTags?.join(', ') || 'none'}

        For each ingredient tag: ${ingredientTags.join(', ')}
        Decide if it is allowed (true/false) and explain why if not allowed.
        Return JSON array:
        [
        { "ingredient": "name", "allowed": Allowed/NotAllowed/Ambiguous, "reason": "..." }
        ]
`;

    try {
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        return JSON.parse(raw);
    } catch (err) {
        console.error("❌ Failed to check diet:", err, "\nRaw:", err?.response || "");
        return ingredientTags.map(tag => ({ ingredient: tag, allowed: true, reason: "" }));
    }
}

module.exports = {
    extractIngredients,
    rewriteRecipeSteps,
    isAllowedForUser
};
