import test from 'node:test';
import assert from 'node:assert/strict';
import { dietaryAnalysis, generatedRecipes } from '../utils/modelResults.js';

const allowed = ingredient => ({ingredient, allowed:'Allowed', reason:'controlled fixture', suggestions:[]});
test('dietary analysis preserves every requested ingredient and cannot approve missing records', () => {
  for (const value of ['', '{}', '[null]', JSON.stringify([allowed('rice')]),
    JSON.stringify([allowed('rice'), allowed('rice')]), JSON.stringify([allowed('rice'), allowed('other')]),
    JSON.stringify([allowed('rice'), {...allowed('milk'), suggestions:42}])]) {
    const rows = dietaryAnalysis(['rice','milk'], value);
    assert.deepEqual(rows.map(row => row.ingredient), ['rice','milk']);
    assert.ok(rows.some(row => row.allowed === 'Ambiguous'));
  }
  assert.deepEqual(dietaryAnalysis(['rice','milk'], JSON.stringify([allowed('milk'),allowed('rice')])), [allowed('rice'),allowed('milk')]);
});

const recipe = () => ({title:'Rice', tags:['simple'], duration:'10 min', ingredients:[{name:'rice',amount:'1',unit:'cup'}], steps:['Cook rice.']});
test('recipe generation requires a complete bounded batch', () => {
  for (const value of ['', '{}', '[]', '[null]', JSON.stringify([recipe()]),
    JSON.stringify([recipe(),recipe(),{...recipe(),steps:[]}]),
    JSON.stringify([recipe(),recipe(),{...recipe(),ingredients:[{name:'rice'}]}]),
    JSON.stringify([recipe(),recipe(),{...recipe(),title:42}]),
    JSON.stringify([recipe(),recipe(),{...recipe(),steps:['x'.repeat(2001)]}]), 'x'.repeat(32001)]) {
    assert.throws(() => generatedRecipes(value,3));
  }
  const rows = [recipe(),recipe(),{...recipe(),id:'untrusted',previewImageUrl:'https://untrusted.invalid'}];
  assert.deepEqual(generatedRecipes('```json\n'+JSON.stringify(rows)+'\n```',3), [recipe(),recipe(),recipe()]);
});
