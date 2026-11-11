import { parseIngredients } from './scanResults.js';

export function parseGenerationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.userId !== 'string' || !body.userId.trim() || body.userId.length > 128) {
    throw new Error('userId must contain 1 to 128 characters');
  }
  if (body.prompt !== undefined && (typeof body.prompt !== 'string' || body.prompt.length > 4000)) {
    throw new Error('prompt must be a string of at most 4000 characters');
  }
  const ingredients = body.ingredients === undefined ? [] : body.ingredients;
  if (!Array.isArray(ingredients)) throw new Error('ingredients must be an array');
  return {
    userId: body.userId.trim(),
    ingredients: ingredients.length ? parseIngredients({ ingredients }) : [],
    prompt: body.prompt ?? '',
  };
}
