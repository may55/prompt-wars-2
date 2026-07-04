import { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import { IOpenAIService } from "../service/openai.service";
import { SessionService } from "../service/session.service";
import { ChatMessage } from "../model/session.model";

export class ExploreController {
  constructor(
    private openAIService: IOpenAIService,
    private sessionService: SessionService,
    private systemPrompt: string
  ) {}

  async explore(c: Context) {
    try {
      let { query } = await c.req.json();
      if (!query || typeof query !== "string" || !query.trim()) {
        return c.json({ error: "Missing or invalid query parameter" }, 400);
      }

      // Sanitize input to strip out any HTML/XML tags
      query = query.replace(/<\/?[^>]+(>|$)/g, "").trim();
      if (!query) {
        return c.json({ error: "Invalid or empty query after sanitization" }, 400);
      }

      const messages: ChatMessage[] = [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: `Explore destination or interest query: "${query}"` },
      ];

      console.log(`Calling Azure OpenAI for search query: "${query}"...`);
      const rawContent = await this.openAIService.callAzureOpenAI(messages, true);

      // Clean markdown formatting if present
      let jsonString = rawContent.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const parsedResult = JSON.parse(jsonString);
      const sessionId = uuidv4();

      await this.sessionService.createSession(
        sessionId,
        query,
        parsedResult.destination,
        parsedResult.attractionsTitle,
        parsedResult.attractionsDesc,
        parsedResult.gemTitle,
        parsedResult.gemDesc,
        parsedResult.story,
        parsedResult.eventTitle,
        parsedResult.eventDesc
      );

      return c.json({
        sessionId,
        ...parsedResult,
      });
    } catch (error: any) {
      console.error("Error in /api/explore:", error);
      return c.json({ error: error.message || "An unexpected error occurred during exploration" }, 500);
    }
  }
}
