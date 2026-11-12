import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import impactRouter from '../routes/impact.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('meal streaks use UTC calendar dates, not elapsed 24-hour periods', async t => {
  const now = Date.parse('2026-11-11T01:00:00Z');
  t.mock.timers.enable({ apis: ['Date'], now });
  let impact;
  let saved;
  t.mock.method(UserStorage, 'findOne', async () => ({ _id: 'fixture' }));
  t.mock.method(UserImpactStorage, 'findOne', async () => impact);
  t.mock.method(UserImpactStorage, 'update', async (_, mutate) => { mutate(impact); saved = structuredClone(impact); return impact; });
  const app = express();
  app.use(express.json());
  app.use('/impact', impactRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const cases = [
      ['2026-11-10T23:00:00Z', 5], // Yesterday, only two hours ago.
      ['2026-11-11T00:00:00Z', 4], // Second meal today.
      ['2026-11-09T23:00:00Z', 1], // Missed a calendar day, less than 48 hours ago.
      [null, 1],
      ['invalid', 1],
      ['2026-11-12T00:00:00Z', 1], // Clock rollback or inconsistent stored timestamp.
      ['2026-11-10T20:00:00-05:00', 4], // Same instant/date in UTC.
    ];
    for (const [last, expected] of cases) {
      impact = { user_id: 'fixture', xp: 90, coins: 2, streak_days: 4,
        total_meals_logged: 9, last_activity_date: last };
      const response = await fetch(`http://127.0.0.1:${server.address().port}/impact/log-meal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'fixture' }), signal: AbortSignal.timeout(2000),
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.streakDays, expected, String(last));
      assert.equal(saved.streak_days, expected);
      assert.equal(saved.last_activity_date.getTime(), now);
      assert.equal(body.total_meals_logged, 10);
      assert.equal(body.xp, 100);
      assert.equal(body.level, 2);
      assert.equal(body.xpToNextLevel, 100);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
