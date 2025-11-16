import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1",
});

// Gemini model from OpenRouter
const MODEL = "google/gemini-2.5-flash";

//
// 1. Extract ingredients
//
export async function extractIngredients(recipeText) {
  const prompt = `
Extract ALL ingredients from the recipe below.
Return ONLY a list with ONE ingredient per line.
No numbering. No explanations.

Recipe:
"""
${recipeText}
"""
`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You extract ingredients from recipes." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const text = raw.trim();

    return text
      .split("\n")
      .map((x) => x.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
  } catch (err) {
    console.error("extractIngredients error:", err);
    return [];
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
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Rewrite recipes using substitutions." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const text = raw.trim();
    return text || originalRecipe;
  } catch (err) {
    console.error("rewriteRecipeSteps error:", err);
    return originalRecipe;
  }
}

//
// helper for JSON clean-up
//
function extractCleanJSON(text) {
  if (!text) return null;

  let cleaned = text.trim();

  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) return match[0];
  return cleaned;
}

//
// 3. Dietary check
//
export async function isAllowedForUser(userPrefs, ingredientTags) {
  const prompt = `
User dietary restrictions:
- Level: ${userPrefs.dietLevel}
- Forbidden tags: ${userPrefs.extraForbiddenTags?.join(", ") || "none"}

Check each ingredient tag:
${ingredientTags.join(", ")}

Return STRICT JSON:
[
  { "ingredient": "", "allowed": "Allowed|NotAllowed|Ambiguous", "reason": "" }
]
`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const cleaned = extractCleanJSON(raw);

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("❌ Failed to parse JSON from model");
      console.error("RAW OUTPUT:\n", raw);
      console.error("CLEANED:\n", cleaned);

      // fallback
      return ingredientTags.map((tag) => ({
        ingredient: tag,
        allowed: "Ambiguous",
        reason: "Fallback — invalid JSON returned by model",
      }));
    }
  } catch (err) {
    console.error("❌ isAllowedForUser ERROR:", err);

    return ingredientTags.map((tag) => ({
      ingredient: tag,
      allowed: "Ambiguous",
      reason: "System error",
    }));
  }
}

//
// 4. Answer with context
//
export async function answerWithContext(userContext, userQuestion) {
  const prompt = `
You are an AI assistant with access to the user's data.

CONTEXT:
${JSON.stringify(userContext, null, 2)}

QUESTION:
"${userQuestion}"

Rules:
- Prefer database context.
- Use general knowledge only when needed.
- Be concise.
`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Answer using context when relevant." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const text = raw.trim();
    return text || "Sorry, I couldn't answer that.";
  } catch (err) {
    console.error("answerWithContext error:", err);
    return "Sorry, I couldn't answer that.";
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
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Generate vegan recipes in strict JSON format.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    const match = raw.match(/\[[\s\S]*\]/);
    const jsonString = match ? match[0] : raw;
    const parsed = JSON.parse(jsonString);

    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("generateRecipes error:", err);
    return [];
  }
}
