import { parseIngredients } from './scanResults.js';

export function extractedIngredients(content) {
  if (typeof content !== 'string' || content.length > 8000) throw new Error('Ingredient extraction unavailable');
  const ingredients = content.split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  return parseIngredients({ingredients});
}

export function rewrittenRecipe(content) {
  if (typeof content !== 'string' || !content.trim() || content.length > 16000) {
    throw new Error('Recipe rewrite unavailable');
  }
  return content.trim();
}
