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
        console.log("   User ID:", user_id);
        console.log("   Question:", question);
        
        const context = await getUserContext(user_id);
        console.log("   Context retrieved:", {
            dietLevel: context.user?.dietLevel,
            recipesCount: context.recipes?.length || 0,
            hasImpact: !!context.impact
        });
        
        const answer = await answerWithContext(context, question);
        console.log("✅ LLM answered chatbot question");
        console.log("   Answer length:", answer.length, "characters");

        res.json({ answer });
    } catch (err) {
        console.error("❌ AI ask error:", err);
        res.status(500).json({ error: "Failed to get AI answer" });
    }
});

export default router;
 
