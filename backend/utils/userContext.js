import { UserStorage, RecipeStorage, UserImpactStorage } from "./jsonStorage.js";

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

  let user;
  let userObjectId;
  
  // Handle shared Albert user
  if (userId === "ALBERT_SHARED_USER") {
    user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Return default context if Albert user doesn't exist yet
      return {
        user: {
          dietLevel: "vegan",
          extraForbiddenTags: [],
          preferredCuisines: [],
          cookingStylePreferences: [],
        },
        recipes: [],
        impact: null,
      };
    }
    userObjectId = user._id;
  } else {
    user = await UserStorage.findById(userId);
    if (!user) {
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
    userObjectId = user._id;
  }
  
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
