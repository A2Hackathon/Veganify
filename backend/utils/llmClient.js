import { createDietaryService } from "./dietaryService.js";
import OpenAI from "openai";
import { createAnswerService } from "./answerService.js";
import { createGenerationService } from "./generationService.js";
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
export const isAllowedForUser = createDietaryService(request =>
  getClient().chat.completions.create({ model: MODEL, ...request }));

//
// 4. Answer with context
//
export const answerWithContext = createAnswerService(request =>
  getClient().chat.completions.create({model: MODEL, ...request}));

//
// 5. Generate vegan recipes
//
export const generateRecipes = createGenerationService(request =>
  getClient().chat.completions.create({model: MODEL, ...request}));
