import express from 'express';

export function createAskRouter({getContext, answer}) {
  const router = express.Router();
  router.post('/ask', async (req,res) => {
    const question = req.body?.question;
    if (typeof question !== 'string' || !question.trim() || question.length > 4000) {
      return res.status(400).json({error:'question must contain 1 to 4000 characters'});
    }
    const controller = new AbortController();
    const cancel = () => { if (!res.writableFinished) controller.abort(); };
    req.once('aborted', cancel);
    res.once('close', cancel);
    if (req.aborted || res.destroyed) controller.abort();
    try {
      controller.signal.throwIfAborted();
      const context = await getContext('ALBERT_SHARED_USER');
      controller.signal.throwIfAborted();
      const result = await answer(context,question.trim(), {signal: controller.signal});
      controller.signal.throwIfAborted();
      res.json({answer: result});
    } catch {
      if (controller.signal.aborted) return;
      console.error('AI request failed');
      res.status(500).json({error:'Failed to get AI answer'});
    } finally {
      req.removeListener('aborted', cancel);
      res.removeListener('close', cancel);
    }
  });
  return router;
}
