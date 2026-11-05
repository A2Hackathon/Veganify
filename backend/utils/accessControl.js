import { createHash, timingSafeEqual } from 'node:crypto';

const validToken = value => typeof value === 'string' && value.length >= 32 && value.length <= 128 && !/[^A-Za-z0-9_-]/.test(value);
const digest = value => createHash('sha256').update(value).digest();

export function sharedDemoAccess(token) {
  const expected = validToken(token) ? digest(token) : null;
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!expected) return res.status(503).json({error: 'API access is not configured'});
    const authorization = req.headers.authorization;
    const supplied = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7) : '';
    if (!validToken(supplied) || !timingSafeEqual(expected, digest(supplied))) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({error: 'Authentication required'});
    }
    next();
  };
}
