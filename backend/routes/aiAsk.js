import express from "express";
import { getUserContext } from "../utils/userContext.js";
import { answerWithContext } from "../utils/llmClient.js";
import { toObjectId } from "../utils/objectIdHelper.js";

const router = express.Router();

// POST /ai/ask
router.post("/ask", async (req, res) => {
  const { userId, user_id, question } = req.body;
  const actualUserId = userId || user_id; // Support both for backward compatibility

  if (!actualUserId || !question) {
    return res.status(400).json({ error: "userId/user_id and question required" });
  }

  try {
    const userObjectId = toObjectId(actualUserId);
    const context = await getUserContext(userObjectId.toString());
    const answer = await answerWithContext(context, question);
    res.json({ answer });
  } catch (err) {
    console.error("ai/ask error:", err);
    res.status(500).json({ error: "Failed to get AI answer" });
  }
});

export default router;
