import multer from 'multer';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10, parts: 11, fieldSize: 8192, fieldNameSize: 100 },
}).single('image');

export function imageUpload(req, res, next) {
  parse(req, res, error => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_VALUE';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Upload exceeds size limit' : 'Invalid image upload' });
  });
}
