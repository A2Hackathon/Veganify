import User from "../models/User.js";
import Recipe from "../models/Recipe.js";
import UserImpact from "../models/UserImpact.js";

export async function getUserContext(userId) {
  if (!userId) {
    return {
      user: {
        dietLevel: "flexitarian",
        extraForbiddenTags: [],
        preferredCuisines: [],
        cookingStylePreferences: [],
      },
      recipes: [],
      impact: null,
    };
  }

  const user = await User.findById(userId).lean();
  const impact = await UserImpact.findOne({ user_id: userId }).lean();
  const recipes = await Recipe.find({ userId }).lean();

  return {
    user: {
      dietLevel: (user?.dietLevel || "flexitarian").toLowerCase(),
      extraForbiddenTags: user?.extraForbiddenTags || [],
      preferredCuisines: user?.preferredCuisines || [],
      cookingStylePreferences: user?.cookingStylePreferences || [],
    },
    recipes: recipes.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      tags: r.tags,
      duration: r.duration,
    })),
    impact: impact
      ? {
          xp: impact.xp,
          coins: impact.coins,
          streak_days: impact.streak_days,
          total_meals_logged: impact.total_meals_logged,
        }
      : null,
  };
}
