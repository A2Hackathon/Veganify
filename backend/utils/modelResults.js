import { scanResult } from './scanResults.js';

function parseArray(content) {
  if (typeof content !== 'string' || content.length > 32000) throw new Error('Invalid model output');
  const text = content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error('Invalid model output');
  return rows;
}

export function dietaryAnalysis(names, content) {
  let rows;
  try { rows = parseArray(content); } catch { rows = null; }
  return scanResult(names, rows).ingredients.map(({name, ...result}) => ({ingredient: name, ...result}));
}

function boundedText(value, limit, required = false) {
  return typeof value === 'string' && value.length <= limit && (!required || value.trim().length > 0);
}

export function generatedRecipes(content, count) {
  const rows = parseArray(content);
  if (!Number.isInteger(count) || count < 1 || count > 3 || rows.length !== count) throw new Error('Incomplete recipes');
  // Validate the entire batch before any caller can persist a partial response.
  for (const recipe of rows) {
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe) ||
        !boundedText(recipe.title, 200, true) || !boundedText(recipe.duration, 100) ||
        !Array.isArray(recipe.tags) || recipe.tags.length > 10 || !recipe.tags.every(tag => boundedText(tag, 100, true)) ||
        !Array.isArray(recipe.ingredients) || !recipe.ingredients.length || recipe.ingredients.length > 100 ||
        !recipe.ingredients.every(item => item && boundedText(item.name, 200, true) &&
          boundedText(item.amount, 100) && boundedText(item.unit, 100)) ||
        !Array.isArray(recipe.steps) || !recipe.steps.length || recipe.steps.length > 50 ||
        !recipe.steps.every(step => boundedText(step, 2000, true))) throw new Error('Invalid recipe');
  }
  // Return only supported fields, never model-supplied IDs or remote image URLs.
  return rows.map(recipe => ({
    title: recipe.title.trim(), tags: recipe.tags.map(tag => tag.trim()), duration: recipe.duration.trim(),
    ingredients: recipe.ingredients.map(item => ({name: item.name.trim(), amount: item.amount.trim(), unit: item.unit.trim()})),
    steps: recipe.steps.map(step => step.trim()),
  }));
}
