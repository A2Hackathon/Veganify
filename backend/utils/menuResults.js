// Reject the whole response when identities or fields are incomplete: partial
// classifications must not silently hide dishes that need independent review.
export function parseMenuAnalysis(names, answer) {
  if (typeof answer !== 'string' || answer.length > 32000) return null;
  const text = answer.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
  let rows;
  try { rows = JSON.parse(text); } catch { return null; }
  if (!Array.isArray(rows) || rows.length !== names.length) return null;
  const expected = new Set(names);
  const results = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        !expected.has(row.name) || results.has(row.name) ||
        !['suitable', 'modifiable', 'not_suitable'].includes(row.status) ||
        typeof row.modificationSuggestion !== 'string' || row.modificationSuggestion.length > 2000 ||
        (row.status === 'modifiable' && !row.modificationSuggestion.trim())) return null;
    results.set(row.name, {
      name: row.name, status: row.status,
      modificationSuggestion: row.modificationSuggestion.trim() || null,
    });
  }
  return names.map(name => results.get(name));
}
