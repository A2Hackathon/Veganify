import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 60000, // 60 seconds timeout for API requests
  maxRetries: 2, // Retry failed requests up to 2 times
});

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
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a thorough ingredient extractor. Extract every single ingredient mentioned in recipes, especially animal products. Return only a plain list, one ingredient per line." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const text = raw.trim();

    const extracted = text
      .split("\n")
      .map((x) => x.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .filter(x => x.length > 0);
    
    console.log(`📋 Extracted ${extracted.length} ingredients: ${extracted.join(", ")}`);
    
    return extracted;
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
// Fallback ingredient analyzer when LLM fails
//
function getFallbackAnalysis(ingredient, dietLevel) {
  const ingredientLower = ingredient.toLowerCase().trim();
  const diet = dietLevel?.toLowerCase() || "vegan";
  
  // Common meat keywords
  const meatKeywords = ["meat", "beef", "pork", "chicken", "turkey", "lamb", "veal", "duck", "bacon", "sausage", "ham", "steak"];
  // Common seafood keywords
  const seafoodKeywords = ["fish", "shrimp", "crab", "lobster", "salmon", "tuna", "cod", "shellfish", "scallops", "mussels"];
  // Common dairy keywords
  const dairyKeywords = ["milk", "cheese", "butter", "cream", "yogurt", "sour cream", "whey", "casein"];
  // Common egg keywords
  const eggKeywords = ["egg", "eggs", "mayonnaise", "mayo"];
  
  let isNotAllowed = false;
  let suggestions = [];
  let reason = "";
  
  // Check for meat
  if (meatKeywords.some(keyword => ingredientLower.includes(keyword))) {
    isNotAllowed = true;
    reason = "Contains meat products";
    if (diet === "vegan") {
      suggestions = ["tofu", "tempeh", "seitan", "jackfruit", "mushrooms", "lentils"];
    } else if (diet === "vegetarian") {
      suggestions = ["tofu", "tempeh", "seitan", "mushrooms", "lentils"];
    }
  }
  // Check for seafood
  else if (seafoodKeywords.some(keyword => ingredientLower.includes(keyword))) {
    isNotAllowed = true;
    reason = "Contains seafood";
    if (diet === "vegan") {
      suggestions = ["tofu", "tempeh", "jackfruit", "hearts of palm", "mushrooms"];
    } else if (diet === "vegetarian") {
      suggestions = ["tofu", "tempeh", "mushrooms"];
    }
  }
  // Check for dairy
  else if (dairyKeywords.some(keyword => ingredientLower.includes(keyword))) {
    isNotAllowed = true;
    reason = "Contains dairy products";
    if (diet === "vegan") {
      if (ingredientLower.includes("milk")) {
        suggestions = ["almond milk", "soy milk", "oat milk", "coconut milk"];
      } else if (ingredientLower.includes("cheese")) {
        suggestions = ["nutritional yeast", "vegan cheese", "cashew cheese"];
      } else if (ingredientLower.includes("butter")) {
        suggestions = ["vegan butter", "coconut oil", "olive oil"];
      } else if (ingredientLower.includes("cream")) {
        suggestions = ["coconut cream", "soy cream", "cashew cream"];
      } else {
        suggestions = ["vegan alternatives"];
      }
    }
  }
  // Check for eggs
  else if (eggKeywords.some(keyword => ingredientLower.includes(keyword))) {
    isNotAllowed = true;
    reason = "Contains eggs";
    if (diet === "vegan") {
      suggestions = ["flax egg (1 tbsp flax + 3 tbsp water)", "chia egg", "applesauce", "silken tofu"];
    }
  }
  
  return {
    ingredient: ingredient,
    allowed: isNotAllowed ? "NotAllowed" : "Ambiguous",
    reason: reason || "Unable to analyze - please check manually",
    suggestions: suggestions
  };
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
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: `You are a strict dietary restriction analyzer for ${dietLevel} diets. You must identify ALL animal products including meat, seafood, dairy, eggs, and animal-derived ingredients. Be thorough and strict. Return only valid JSON arrays.` },
        { role: "user", content: prompt }
      ],
    });

    const raw = response.choices?.[0]?.message?.content || "";
    const cleaned = extractCleanJSON(raw);

    try {
      const parsed = JSON.parse(cleaned);
      console.log(`✅ isAllowedForUser: Analyzed ${ingredientTags.length} ingredients, got ${parsed.length} results`);
      
      return parsed.map(item => {
        const allowed = item.allowed || "Ambiguous";
        let suggestions = Array.isArray(item.suggestions) ? item.suggestions : [];
        
        // If ingredient is NotAllowed but has no suggestions, use fallback
        if (allowed === "NotAllowed" && suggestions.length === 0) {
          console.log(`⚠️ No suggestions provided for "${item.ingredient}", using fallback`);
          const fallback = getFallbackAnalysis(item.ingredient || "", dietLevel);
          suggestions = fallback.suggestions;
        }
        
        return {
          ingredient: item.ingredient || "",
          allowed: allowed,
          reason: item.reason || "",
          suggestions: suggestions
        };
      });
    } catch (err) {
      console.error("❌ Failed to parse JSON from model");
      console.error("RAW OUTPUT:\n", raw);
      console.error("CLEANED:\n", cleaned);
      console.error("⚠️ Using fallback analysis due to JSON parsing error");

      // Use fallback analysis for each ingredient
      return ingredientTags.map((tag) => {
        const fallback = getFallbackAnalysis(tag, dietLevel);
        console.log(`📋 Fallback for "${tag}": ${fallback.allowed} - ${fallback.reason}`);
        return fallback;
      });
    }
  } catch (err) {
    console.error("❌ isAllowedForUser ERROR:", err);
    console.error("Error details:", err.message);
    console.error("⚠️ Using fallback analysis for ingredients");

    // Use fallback analysis for each ingredient
    return ingredientTags.map((tag) => {
      const fallback = getFallbackAnalysis(tag, dietLevel);
      console.log(`📋 Fallback for "${tag}": ${fallback.allowed} - ${fallback.reason}`);
      return fallback;
    });
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
    
    const response = await client.chat.completions.create({
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
