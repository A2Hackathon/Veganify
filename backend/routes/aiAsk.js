// routes/aiAsk.js
import express from "express";
import { getUserContext } from "../utils/userContext.js";
import { answerWithContext } from "../utils/llmClient.js";

const router = express.Router();

// POST /ai/ask
// body: { user_id, question }
router.post("/ask", async (req, res) => {
    const { user_id, question } = req.body;

    if (!user_id || !question)
        return res.status(400).json({ error: "user_id and question required" });

    try {
        console.log("🔍 Calling LLM (answerWithContext) for chatbot question...");
        const context = await getUserContext(user_id);
        const answer = await answerWithContext(context, question);
        console.log("✅ LLM answered chatbot question");

        res.json({ answer });
    } catch (err) {
        console.error("AI ask error:", err);
        res.status(500).json({ error: "Failed to get AI answer" });
    }
});

export default router;
 
