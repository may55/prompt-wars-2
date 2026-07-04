import { describe, expect, it } from "bun:test";
import { createApp } from "../../src/app";
import { ExploreController } from "../../src/controller/explore.controller";
import { ChatController } from "../../src/controller/chat.controller";
import { IOpenAIService } from "../../src/service/openai.service";
import { InMemorySessionRepository } from "../../src/repo/session.repo";
import { SessionService } from "../../src/service/session.service";
import { ChatMessage } from "../../src/model/session.model";

// Mock OpenAI Service implementation
class MockOpenAIService implements IOpenAIService {
  public mockResponse = "";
  public lastMessagesPassed: ChatMessage[] = [];
  public lastResponseJsonPassed = false;

  async callAzureOpenAI(messages: ChatMessage[], responseJson?: boolean): Promise<string> {
    this.lastMessagesPassed = messages;
    this.lastResponseJsonPassed = !!responseJson;
    return this.mockResponse;
  }
}

describe("Wayfinder Endpoint Controllers", () => {
  const healthUrl = "http://localhost/health";
  const exploreUrl = "http://localhost/api/explore";
  const chatUrl = "http://localhost/api/chat";

  it("should return healthy on GET /health", async () => {
    const mockOpenAI = new MockOpenAIService();
    const repo = new InMemorySessionRepository();
    const service = new SessionService(repo);
    const exploreCtrl = new ExploreController(mockOpenAI, service);
    const chatCtrl = new ChatController(mockOpenAI, service);
    const app = createApp(exploreCtrl, chatCtrl);

    const response = await app.request(healthUrl);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("healthy");
    expect(json.timestamp).toBeDefined();
  });

  describe("POST /api/explore", () => {
    it("should return 400 on empty query", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      const response = await app.request(exploreUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Missing or invalid query parameter");
    });

    it("should parse prompt and create a session for valid query", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      const mockResult = {
        destination: "Jaipur, Rajasthan",
        attractionsTitle: "Pink City Forts",
        attractionsDesc: "Fascinating royal palaces.",
        gemTitle: "Panna Meena ka Kund",
        gemDesc: "A symmetrical stepwell.",
        story: "Founded by Maharaja Sawai Jai Singh II...",
        eventTitle: "Gangaur Festival",
        eventDesc: "A colorful state festival.",
      };
      mockOpenAI.mockResponse = JSON.stringify(mockResult);

      const response = await app.request(exploreUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Jaipur" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.sessionId).toBeDefined();
      expect(json.destination).toBe("Jaipur, Rajasthan");

      // Verify repo was updated
      expect(await repo.has(json.sessionId)).toBe(true);
    });
  });

  describe("POST /api/chat", () => {
    it("should return 400 for malformed parameters", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      const res1 = await app.request(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      });
      expect(res1.status).toBe(400);

      const res2 = await app.request(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "sess-1" }),
      });
      expect(res2.status).toBe(400);
    });

    it("should return 404 for unknown session ID", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      const response = await app.request(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "missing-session", message: "Hello" }),
      });

      expect(response.status).toBe(404);
    });

    it("should chat successfully and persist history", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      const sessionId = "session-999";
      await repo.set(sessionId, {
        id: sessionId,
        query: "Delhi",
        history: [
          { role: "system", content: "Guide role" },
          { role: "user", content: "Tell me about Delhi" },
          { role: "assistant", content: "Delhi is the capital." },
        ],
      });

      mockOpenAI.mockResponse = "Sure, the Red Fort is in Old Delhi.";

      const response = await app.request(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: "What about Red Fort?" }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBe("Sure, the Red Fort is in Old Delhi.");

      // Check stored history length
      const stored = await repo.get(sessionId);
      expect(stored?.history).toHaveLength(5);
      expect(stored?.history[4]).toEqual({ role: "assistant", content: "Sure, the Red Fort is in Old Delhi." });
    });
  });

  describe("Security and Rate Limiting", () => {
    it("should sanitize query input by stripping HTML tags", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      const app = createApp(exploreCtrl, chatCtrl);

      mockOpenAI.mockResponse = JSON.stringify({
        destination: "Jaipur, Rajasthan",
        attractionsTitle: "Amber Fort",
        attractionsDesc: "Amber Fort desc.",
        gemTitle: "Kund",
        gemDesc: "Kund desc.",
        story: "Story desc.",
        eventTitle: "Fest",
        eventDesc: "Fest desc.",
      });

      const response = await app.request(exploreUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "<script>alert('hack')</script>Jaipur<b>" }),
      });

      expect(response.status).toBe(200);
      expect(mockOpenAI.lastMessagesPassed[1].content).toBe('Explore destination or interest query: "alert(\'hack\')Jaipur"');
    });

    it("should rate limit requests when exceeding the limit", async () => {
      const mockOpenAI = new MockOpenAIService();
      const repo = new InMemorySessionRepository();
      const service = new SessionService(repo);
      const exploreCtrl = new ExploreController(mockOpenAI, service);
      const chatCtrl = new ChatController(mockOpenAI, service);
      
      const { Hono } = require("hono");
      const { rateLimiter, rateLimitMap } = require("../../src/app");
      
      // Clear the map to ensure test isolation
      rateLimitMap.clear();

      const customApp = new Hono();
      customApp.use("/api/*", rateLimiter(2, 60 * 1000));
      customApp.post("/api/explore", (c: any) => c.json({ ok: true }));

      // Request 1
      let res = await customApp.request(exploreUrl, { method: "POST" });
      expect(res.status).toBe(200);

      // Request 2
      res = await customApp.request(exploreUrl, { method: "POST" });
      expect(res.status).toBe(200);

      // Request 3 -> Rate Limit Hit
      res = await customApp.request(exploreUrl, { method: "POST" });
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toBe("Too many requests. Please try again later.");
    });
  });
});
