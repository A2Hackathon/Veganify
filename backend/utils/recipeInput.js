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

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value, limit, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
    throw new Error('Invalid recipe text');
  }
  return value;
}

function list(value, limit, parse) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) throw new Error('Invalid recipe list');
  return value.map(parse);
}

export function parseSaveRequest(body) {
  if (!isRecord(body)) throw new Error('Invalid save request');
  text(body.userId, 128, true);
  const recipe = Object.hasOwn(body, 'recipe') ? body.recipe : body;
  if (!isRecord(recipe)) throw new Error('Invalid recipe');
  const type = recipe.type ?? 'simplified';
  if (!['simplified', 'veganized'].includes(type)) throw new Error('Invalid recipe type');
  let substitutionMap;
  if (recipe.substitutionMap != null) {
    if (!isRecord(recipe.substitutionMap) || Object.keys(recipe.substitutionMap).length > 100) {
      throw new Error('Invalid substitutions');
    }
    substitutionMap = Object.fromEntries(Object.entries(recipe.substitutionMap).map(([key, value]) =>
      [text(key, 200, true), text(value, 200, true)]));
  }
  return {
    title: text(recipe.title, 200, true),
    tags: list(recipe.tags, 10, value => text(value, 100, true)),
    duration: text(recipe.duration, 100),
    ingredients: list(recipe.ingredients, 100, ingredient => {
      if (!isRecord(ingredient)) throw new Error('Invalid ingredient');
      return { name: text(ingredient.name, 200, true), amount: text(ingredient.amount, 100), unit: text(ingredient.unit, 100) };
    }),
    steps: list(recipe.steps, 50, value => text(value, 2000, true)),
    previewImageUrl: text(recipe.previewImageUrl, 2048),
    originalPrompt: text(recipe.originalPrompt, 16000),
    type,
    substitutionMap,
  };
}
