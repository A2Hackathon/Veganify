import express from 'express';

export function createAskRouter({getContext, answer}) {
  const router = express.Router();
  router.post('/ask', async (req,res) => {
    const {question} = req.body;
    if (!question) return res.status(400).json({error:'question required'});
    try {
      const context = await getContext('ALBERT_SHARED_USER');
      res.json({answer: await answer(context,question)});
    } catch {
      console.error('AI request failed');
      res.status(500).json({error:'Failed to get AI answer'});
    }
  });
  return router;
}
