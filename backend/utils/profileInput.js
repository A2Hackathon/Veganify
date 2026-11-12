import { eatingStyleToDietLevel } from './dietMapping.js';

function boundedText(value, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('Invalid profile text');
}

export function validateProfileInput(body, { onboarding = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid profile');
  if (!onboarding) boundedText(body.id, 128);
  for (const field of ['userName', 'sproutName']) {
    if (body[field] != null) boundedText(body[field], 200);
  }
  for (const field of ['dietaryRestrictions', 'cuisinePreferences', 'cookingStylePreferences']) {
    const values = body[field];
    // Null and omitted lists retain the routes' existing default/partial-update behavior.
    if (values == null) continue;
    if (!Array.isArray(values) || values.length > 100) throw new Error('Invalid preference list');
    for (const value of values) boundedText(value, 200);
    if (values.reduce((sum, value) => sum + value.length, 0) > 8000) throw new Error('Preferences too long');
  }
  return onboarding || Object.hasOwn(body, 'eatingStyle') ? eatingStyleToDietLevel(body.eatingStyle) : undefined;
}
