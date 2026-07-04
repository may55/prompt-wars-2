import { Context } from "hono";
import { IOpenAIService } from "../service/openai.service";
import { SessionService } from "../service/session.service";

export class ChatController {
  constructor(
    private openAIService: IOpenAIService,
    private sessionService: SessionService
  ) {}

  async chat(c: Context) {
    try {
      const { sessionId, message } = await c.req.json();
      if (!sessionId || typeof sessionId !== "string") {
        return c.json({ error: "Missing or invalid sessionId" }, 400);
      }
      if (!message || typeof message !== "string" || !message.trim()) {
        return c.json({ error: "Missing or invalid message" }, 400);
      }

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        return c.json({ error: "Active session not found or session has expired" }, 404);
      }

      // Add user message to session history
      await this.sessionService.addMessageToSession(sessionId, "user", message);

      console.log(`Calling Azure OpenAI for chat session ${sessionId}...`);
      const reply = await this.openAIService.callAzureOpenAI(session.history, false);

      // Add assistant reply to session history
      await this.sessionService.addMessageToSession(sessionId, "assistant", reply);

      return c.json({ message: reply });
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      return c.json({ error: error.message || "An unexpected error occurred during chat" }, 500);
    }
  }
}
