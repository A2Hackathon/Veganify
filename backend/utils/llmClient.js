import { createDietaryService } from "./dietaryService.js";
import OpenAI from "openai";
import { createAnswerService } from "./answerService.js";
import { createGenerationService } from "./generationService.js";
import { createRewriteService } from "./rewriteService.js";
import { extractedIngredients } from "./recipeResults.js";

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
export const rewriteRecipeSteps = createRewriteService(request =>
  getClient().chat.completions.create({model: MODEL, ...request}));

//
// 3. Dietary check
//
export const isAllowedForUser = createDietaryService(request =>
  getClient().chat.completions.create({ model: MODEL, ...request }));

//
// 4. Answer with context
//
export const answerWithContext = createAnswerService((request, options) =>
  getClient().chat.completions.create({model: MODEL, ...request}, options));

//
// 5. Generate vegan recipes
//
export const generateRecipes = createGenerationService(request =>
  getClient().chat.completions.create({model: MODEL, ...request}));
