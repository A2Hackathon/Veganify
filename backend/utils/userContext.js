// utils/userContext.js
import UserImpact from "../models/UserImpact.js";
import Recipe from "../models/recipe.js";
import User from "../models/User.js";

/**
 * Fetches all relevant user data from MongoDB for AI context
 * @param {string} user_id - MongoDB ObjectId
 * @returns {Object} user context including recipes, dietary prefs, and impact
 */
export async function getUserContext(user_id) {
    const user = await User.findById(user_id).lean();
    const userRecipes = await Recipe.find({ userID: user_id }).lean(); // user's recipes
    const impact = await UserImpact.findOne({ user_id }).lean();

    return {
        user: {
            dietLevel: user?.dietLevel || "FLEXITARIAN",
            extraForbiddenTags: user?.extraForbiddenTags || [],
        },
        recipes: userRecipes.map(r => r.recipe).flat(), // flatten array of arrays to single list of recipe items
        impact
    };
}
