const dietLevels = new Map([
  ['vegan', 'vegan'], ['ovo-vegetarian', 'ovo'], ['lacto-vegetarian', 'lacto'],
  ['lacto-ovo vegetarian', 'lacto_ovo'], ['lacto-ovo-vegetarian', 'lacto_ovo'],
  ['vegetarian', 'vegetarian'], ['pescatarian', 'pescatarian'], ['flexitarian', 'flexitarian'],
]);

export function eatingStyleToDietLevel(value) {
  const level = typeof value === 'string' ? dietLevels.get(value.trim().toLowerCase()) : undefined;
  if (!level) throw new Error('Unsupported eating style');
  return level;
}
