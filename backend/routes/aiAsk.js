import { createAskRouter } from "./askRouter.js";
import { getUserContext } from "../utils/userContext.js";
import { answerWithContext } from "../utils/llmClient.js";

export default createAskRouter({getContext: getUserContext, answer: answerWithContext});
