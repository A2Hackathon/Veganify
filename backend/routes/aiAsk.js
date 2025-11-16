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
    const context = await getUserContext("ALBERT_SHARED_USER");
    console.log("Calling AI with question:", question);
    const answer = await answerWithContext(context, question);
    console.log("AI response received:", answer.substring(0, 100));
    res.json({ answer });
  } catch (err) {
    console.error("ai/ask error:", err);
    console.error("   Error details:", err.message);
    console.error("   Error stack:", err.stack);
    res.status(500).json({ error: "Failed to get AI answer", message: err.message });
  }
});

export default router;
