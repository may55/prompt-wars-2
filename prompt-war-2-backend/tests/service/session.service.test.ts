import { describe, expect, it } from "bun:test";
import { InMemorySessionRepository } from "../../src/repo/session.repo";
import { SessionService } from "../../src/service/session.service";

describe("SessionService Workflow", () => {
  it("should create and manage sessions via the session repository", async () => {
    const repo = new InMemorySessionRepository();
    const service = new SessionService(repo);
    const sessionId = "session-id-456";

    // Create session
    const createdSession = await service.createSession(
      sessionId,
      "Goa",
      "Goa, India",
      "Beaches",
      "Sunny sandy beaches",
      "Divar Island",
      "Scenic island village",
      "Historical Portuguese colony",
      "Sunburn Festival",
      "Yearly music festival"
    );

    expect(createdSession.id).toBe(sessionId);
    expect(createdSession.query).toBe("Goa");
    expect(createdSession.history).toHaveLength(3); // system, user, assistant

    // Retrieve from repository
    const stored = await service.getSession(sessionId);
    expect(stored).toBeDefined();
    expect(stored?.query).toBe("Goa");

    // Add a message
    const updated = await service.addMessageToSession(sessionId, "user", "What is the best time to visit?");
    expect(updated.history).toHaveLength(4);
    expect(updated.history[3]).toEqual({ role: "user", content: "What is the best time to visit?" });

    // Ensure it was updated in storage
    const storedAgain = await service.getSession(sessionId);
    expect(storedAgain?.history).toHaveLength(4);
  });

  it("should throw error if session does not exist when adding messages", async () => {
    const repo = new InMemorySessionRepository();
    const service = new SessionService(repo);

    expect(service.addMessageToSession("non-existent", "user", "hi")).rejects.toThrow(
      "Active session not found or session has expired"
    );
  });
});
