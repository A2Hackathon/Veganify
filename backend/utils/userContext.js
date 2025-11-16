import { UserStorage, RecipeStorage, UserImpactStorage } from "./jsonStorage.js";

export async function getUserContext(userId) {
  // ALWAYS use the single Albert user - ignore provided userId
  let user = await UserStorage.findOne({ sproutName: "Albert" });
  
  if (!user) {
    // Create Albert user if it doesn't exist
    user = await UserStorage.create({
      name: "User",
      dietLevel: "vegan",
      extraForbiddenTags: [],
      preferredCuisines: ["Chinese"],
      cookingStylePreferences: ["Spicy"],
      sproutName: "Albert",
    });
  }
  
  const userObjectId = user._id;
  
  const impact = await UserImpactStorage.findOne({ user_id: userObjectId });
  const recipes = await RecipeStorage.find({ userId: userObjectId });

  return {
    user: {
      dietLevel: (user?.dietLevel || "flexitarian").toLowerCase(),
      extraForbiddenTags: user?.extraForbiddenTags || [],
      preferredCuisines: user?.preferredCuisines || [],
      cookingStylePreferences: user?.cookingStylePreferences || [],
    },
    recipes: recipes.map((r) => ({
      id: r._id || r.id,
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
