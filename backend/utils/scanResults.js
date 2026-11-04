export function parseIngredients({ text, ingredients } = {}) {
  if (ingredients !== undefined && !Array.isArray(ingredients)) throw new Error('Invalid ingredients');
  if (ingredients === undefined && typeof text !== 'string') throw new Error('Invalid text');
  if (typeof text === 'string' && text.length > 8000) throw new Error('Text too long');
  const values = ingredients ?? text.split(/[\n,]/).map(value => value.trim()).filter(Boolean);
  if (!values.length || values.length > 100 || values.some(value => typeof value !== 'string' || !value.trim() || value.length > 200)) {
    throw new Error('Expected 1 to 100 ingredient names of at most 200 characters');
  }
  if (values.reduce((total, value) => total + value.length, 0) > 8000) throw new Error('Ingredients too long');
  return [...new Set(values.map(value => value.trim()))];
}

export function scanResult(ingredients, checks) {
  const expected = new Set(ingredients);
  const rows = new Map();
  let invalid = !Array.isArray(checks) || checks.length > 100;
  if (!invalid) {
    for (const item of checks) {
      if (!item || typeof item !== 'object' || typeof item.ingredient !== 'string' ||
          !expected.has(item.ingredient.trim()) || rows.has(item.ingredient.trim())) {
        invalid = true;
        break;
      }
      rows.set(item.ingredient.trim(), item);
    }
  }
  const formatted = ingredients.map(name => {
    const item = invalid ? undefined : rows.get(name);
    const valid = item && ['Allowed', 'NotAllowed', 'Ambiguous'].includes(item.allowed) &&
      typeof item.reason === 'string' && item.reason.length <= 2000 &&
      Array.isArray(item.suggestions) && item.suggestions.length <= 10 &&
      item.suggestions.every(value => typeof value === 'string' && value.length <= 200);
    return valid ? { name, allowed: item.allowed, reason: item.reason, suggestions: item.suggestions } : {
      name, allowed: 'Ambiguous', reason: 'Analysis unavailable or incomplete; verify this ingredient independently.', suggestions: [],
    };
  });
  return {
    success: formatted.length > 0,
    isConsumable: formatted.length > 0 && formatted.every(item => item.allowed === 'Allowed'),
    ingredients: formatted,
  };
}
