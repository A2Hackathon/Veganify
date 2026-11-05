export function createAnswerService(complete) {
  return async function answerWithContext(userContext, userQuestion) {
    const systemPrompt = `You are a friendly vegan cooking assistant named Sprout. You help users with vegan cooking tips, dietary questions, and general cooking advice. Be conversational, helpful, and enthusiastic about plant-based cooking. 

  IMPORTANT: Do NOT generate full recipes. Instead, provide helpful tips, suggestions, and guidance. If users ask for recipes, politely direct them to use the recipe generation features in the app (like "Cook With This" which uses their grocery list).`;
    
    const userPrompt = `User question: "${userQuestion}"

  User context (for reference):
  - Diet: ${userContext?.user?.dietLevel || "vegan"}
  - Dietary restrictions: ${userContext?.user?.extraForbiddenTags?.join(", ") || "none"}
  - Preferred cuisines: ${userContext?.user?.preferredCuisines?.join(", ") || "none"}
  - Cooking style: ${userContext?.user?.cookingStylePreferences?.join(", ") || "none"}
  - Saved recipes: ${userContext?.recipes?.length || 0}
  - XP: ${userContext?.impact?.xp || 0}

  Answer the user's question naturally. If it's a greeting, respond warmly. If they ask for a recipe or dish, politely explain that you can provide cooking tips and suggestions, but for full recipes they should use the "Cook With This" feature which generates recipes from their grocery list.`;

    try {
      
      const response = await complete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      });


      const raw = response.choices?.[0]?.message?.content || "";
      const text = raw.trim();
      
      if (!text) {
        return "I'm here to help! What would you like to cook today?";
      }
      
      return text;
    } catch {
      console.error("AI answer unavailable");
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }
  };
}
