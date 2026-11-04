import OpenAI from "openai";
import { dietaryAnalysis, generatedRecipes } from "./modelResults.js";
import { extractedIngredients, rewrittenRecipe } from "./recipeResults.js";

import { createModelClient } from "./modelClient.js";

let client;
function getClient() {
  // Resolve configuration at request time, after server dotenv initialization.
  if (!client) client = createModelClient(OpenAI);
  return client;
}

// Gemini model from OpenRouter
const MODEL = "google/gemini-2.5-flash";

//
// 1. Extract ingredients
//
export async function extractIngredients(recipeText) {
  const prompt = `
Extract ALL ingredients from the recipe below. Be thorough and include EVERY ingredient mentioned, including:
- All meats (beef, pork, chicken, turkey, lamb, veal, etc. - including ground, diced, sliced, whole, etc.)
- All seafood (fish, shrimp, crab, lobster, etc.)
- All dairy products (milk, cheese, butter, cream, yogurt, etc.)
- All eggs and egg products
- All animal-derived ingredients (broth, stock, gelatin, lard, etc.)
- All other ingredients (vegetables, spices, oils, etc.)

Return ONLY a list with ONE ingredient per line.
No numbering. No explanations.
Include the full ingredient name as written (e.g., "ground beef" not just "beef", "chicken breast" not just "chicken").

Recipe:
"""
${recipeText}
"""
`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a thorough ingredient extractor. Extract every single ingredient mentioned in recipes, especially animal products. Return only a plain list, one ingredient per line." },
        { role: "user", content: prompt },
      ],
    });

    return extractedIngredients(response.choices?.[0]?.message?.content);
  } catch {
    // A provider failure is not evidence that a recipe has no ingredients.
    throw new Error("Ingredient extraction unavailable");
  }
}

//
// 2. Rewrite recipe steps with substitutions
//
export async function rewriteRecipeSteps(subs, originalRecipe) {
  let instructions = subs
    .filter((s) => s.substitute)
    .map((s) => `- Replace "${s.original}" with "${s.substitute}".`)
    .join("\n");

  const prompt = `
You are rewriting a cooking recipe.

Substitutions (apply all):
${instructions || "- No substitutions listed."}

Original Recipe:
"""
${originalRecipe}
"""

Rules:
- Keep the original structure of the recipe (steps / paragraphs).
- Just swap ingredients and adjust wording where needed.
- Do NOT add explanations or notes.
- Return ONLY the rewritten recipe text, nothing else.
`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Rewrite recipes using substitutions." },
        { role: "user", content: prompt },
      ],
    });

    return rewrittenRecipe(response.choices?.[0]?.message?.content);
  } catch {
    // Never save the original recipe as a successful adaptation after failure.
    throw new Error("Recipe rewrite unavailable");
  }
}

//
// 3. Dietary check
//
export async function isAllowedForUser(userPrefs, ingredientTags) {
  const dietLevel = userPrefs.dietLevel?.toLowerCase() || "vegan";
  
  const prompt = `
User dietary restrictions:
- Level: ${dietLevel}
- Forbidden tags: ${userPrefs.extraForbiddenTags?.join(", ") || "none"}

IMPORTANT: For ${dietLevel} diet, the following are NOT ALLOWED:
- ALL meat products (beef, pork, chicken, turkey, lamb, veal, duck, game meat, etc. - including ground, diced, sliced, whole, processed, etc.)
- ALL seafood (fish, shrimp, crab, lobster, scallops, mussels, etc.)
- ALL dairy products (milk, cheese, butter, cream, yogurt, sour cream, etc.)
- ALL eggs and egg products
- ALL animal-derived ingredients (chicken broth, beef stock, fish sauce, gelatin, lard, etc.)
- Honey (for strict vegan)

Check each ingredient carefully:
${ingredientTags.join(", ")}

For each ingredient:
1. Check if it contains ANY animal products (meat, seafood, dairy, eggs, animal-derived ingredients)
2. If it's a compound ingredient (e.g., "chicken broth"), mark it as NotAllowed
3. If it's ambiguous (e.g., "broth" without specification), mark as Ambiguous
4. For NotAllowed ingredients, provide 2-3 specific vegan/plant-based substitute suggestions

Return STRICT JSON:
[
  { 
    "ingredient": "", 
    "allowed": "Allowed|NotAllowed|Ambiguous", 
    "reason": "Brief explanation",
    "suggestions": []
  }
]

Be strict: When in doubt about animal products, mark as NotAllowed or Ambiguous.
For "NotAllowed" ingredients, include at least 2-3 substitute suggestions in the suggestions array.
`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: `You are a strict dietary restriction analyzer for ${dietLevel} diets. You must identify ALL animal products including meat, seafood, dairy, eggs, and animal-derived ingredients. Be thorough and strict. Return only valid JSON arrays.` },
        { role: "user", content: prompt }
      ],
    });

    return dietaryAnalysis(ingredientTags, response.choices?.[0]?.message?.content);
  } catch {
    return dietaryAnalysis(ingredientTags, null);
  }
}

//
// 4. Answer with context
//
export async function answerWithContext(userContext, userQuestion) {
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
    console.log("Calling OpenAI API with model:", MODEL);
    console.log("User prompt length:", userPrompt.length);
    
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    });

    console.log("OpenAI API response received");
    console.log("Response choices count:", response.choices?.length || 0);

    const raw = response.choices?.[0]?.message?.content || "";
    const text = raw.trim();
    
    if (!text) {
      console.error("Empty response from AI");
      return "I'm here to help! What would you like to cook today?";
    }
    
    console.log("AI response length:", text.length);
    return text;
  } catch (err) {
    console.error("answerWithContext error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error status:", err.status);
    if (err.response) {
      console.error("API response status:", err.response.status);
      console.error("API response data:", JSON.stringify(err.response.data, null, 2));
    }
    if (err.error) {
      console.error("Error object:", JSON.stringify(err.error, null, 2));
    }
    console.error("Full error stack:", err.stack);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

//
// 5. Generate vegan recipes
//
export async function generateRecipes(ingredients, count = 3) {
  const prompt = `
Generate ${count} VEGAN recipes using these ingredients:

${ingredients.join(", ")}

Return STRICT JSON array:
[
  {
    "title": "",
    "tags": [],
    "duration": "",
    "ingredients": [
      { "name": "", "amount": "", "unit": "" }
    ],
    "steps": []
  }
]
`;

  try {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Generate vegan recipes in strict JSON format.",
        },
        { role: "user", content: prompt },
      ],
    });

    return generatedRecipes(response.choices?.[0]?.message?.content, count);
  } catch {
    throw new Error("Recipe generation unavailable");
  }
}
