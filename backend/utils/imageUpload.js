import multer from 'multer';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CONCURRENT_UPLOADS = 4;
const parse = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10, parts: 11, fieldSize: 8192, fieldNameSize: 100,
    // Scan forms use scalar fields; reject nested objects and sparse arrays before allocation.
    fieldNestingDepth: 0, fieldArrayIndexLimit: 0,
  },
}).single('image');

export function createImageUpload({maxConcurrent = MAX_CONCURRENT_UPLOADS} = {}) {
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) throw new Error('Invalid upload capacity');
  let active = 0;
  return function upload(req, res, next) {
    if (active >= maxConcurrent) {
      res.set('Retry-After', '1');
      return res.status(503).json({error: 'Image upload capacity unavailable; retry later'});
    }
    active++;
    let parsed = false;
    let responseEnded = false;
    let released = false;
    const release = () => {
      // A closed response alone is insufficient while multipart cleanup is pending.
      if (released || !parsed || !responseEnded) return;
      released = true;
      active--;
      res.removeListener('finish', end);
      res.removeListener('close', end);
    };
    const end = () => { responseEnded = true; release(); };
    res.once('finish', end);
    res.once('close', end);
    parse(req, res, error => {
      parsed = true;
      responseEnded ||= req.aborted || res.destroyed || res.writableFinished;
      release();
      if (responseEnded) return;
      if (!error) return next();
      const tooLarge = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_VALUE';
      res.status(tooLarge ? 413 : 400).json({error: tooLarge ? 'Upload exceeds size limit' : 'Invalid image upload'});
    });
  };
}

// All scan routes import the same instance, so they share one admission budget.
export const imageUpload = createImageUpload();
