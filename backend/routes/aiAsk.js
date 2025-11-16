import express from "express";
import { getUserContext } from "../utils/userContext.js";
import { answerWithContext } from "../utils/llmClient.js";

const router = express.Router();

// POST /ai/ask
router.post("/ask", async (req, res) => {
  const { userId, user_id, question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "question required" });
  }

  try {
    // ALWAYS use the default Albert user - no userId required
    // This allows chatbot to work without onboarding
    const context = await getUserContext("ALBERT_SHARED_USER");
    const answer = await answerWithContext(context, question);
    res.json({ answer });
  } catch (err) {
    console.error("ai/ask error:", err);
    console.error("   Error details:", err.message);
    res.status(500).json({ error: "Failed to get AI answer" });
  }
});

export default router;
