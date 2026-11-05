export function httpErrors(err, req, res, next) {
  if (res.headersSent) return next(err);
  res.set('Cache-Control', 'no-store');
  // Only known parser errors become client responses. Never serialize arbitrary
  // exception messages: they can contain submitted data or storage paths.
  if (err?.type === 'entity.parse.failed' && err.status === 400) {
    return res.status(400).json({error: 'Invalid JSON body'});
  }
  if (err?.type === 'entity.too.large' && err.status === 413) {
    return res.status(413).json({error: 'Request body too large'});
  }
  if (['charset.unsupported', 'encoding.unsupported'].includes(err?.type) && err.status === 415) {
    return res.status(415).json({error: 'Unsupported request encoding'});
  }
  console.error('Unhandled request failure');
  return res.status(500).json({error: 'Internal Server Error'});
}
