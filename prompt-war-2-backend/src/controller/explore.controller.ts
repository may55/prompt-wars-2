import { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import { IOpenAIService } from "../service/openai.service";
import { SessionService } from "../service/session.service";
import { ChatMessage } from "../model/session.model";

export class ExploreController {
  constructor(
    private openAIService: IOpenAIService,
    private sessionService: SessionService
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

      const systemPrompt = `You are an expert cultural guide specializing in Indian travel, heritage, and history. \n` +
        `Analyze the user's destination or interest query. Return a JSON object with exactly the following keys:\n` +
        `- "destination": The formatted name of the city/region and state (e.g., "Hampi, Karnataka").\n` +
        `- "attractionsTitle": A catchy title for the primary attractions/hotspots.\n` +
        `- "attractionsDesc": A detailed 3-4 sentence guide to the main attractions focusing on cultural significance.\n` +
        `- "gemTitle": A title for an off-the-beaten-path hidden gem (a quiet monument, local artisan community, or traditional food joint).\n` +
        `- "gemDesc": A compelling description of the hidden gem and how to experience it authentically.\n` +
        `- "story": An immersive, storytelling narrative about the history, a local legend, folklore, or heritage of this place. Make it feel alive and narrative-rich.\n` +
        `- "eventTitle": Title of a major local festival, cultural event, workshop, or local craft experience.\n` +
        `- "eventDesc": Description of the event/experience, highlighting how a traveler can participate.\n` +
        `\n` +
        `Ensure all text is creative, high-quality, and addresses the goal of deep cultural connection. Return ONLY valid JSON.`;

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
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
