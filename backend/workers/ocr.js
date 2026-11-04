import Tesseract from 'tesseract.js';

// The parent owns the process deadline, including import, model initialization
// and worker termination. Tesseract's Node workers are threads in this process.
process.once('message', async image => {
  try {
    if (!Buffer.isBuffer(image)) throw new Error('Invalid input');
    const result = await Tesseract.recognize(image, 'eng');
    const text = result?.data?.text;
    if (typeof text !== 'string' || text.length > 8000) throw new Error('Invalid result');
    process.send({ text });
  } catch { process.send({ error: 'OCR failed' }); }
});
process.once('disconnect', () => process.exit(1));
