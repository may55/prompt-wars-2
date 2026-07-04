import { describe, expect, it } from "bun:test";
import { InMemorySessionRepository } from "../../src/repo/session.repo";
import { Session } from "../../src/model/session.model";

describe("InMemorySessionRepository", () => {
  it("should perform CRUD lifecycle on sessions correctly", async () => {
    const repo = new InMemorySessionRepository();
    const sessionId = "sess-repo-123";
    const sessionData: Session = {
      id: sessionId,
      query: "Kerala",
      history: [
        { role: "user", content: "Tell me about Kerala" },
        { role: "assistant", content: "Kerala is known for backwaters." },
      ],
    };

    expect(await repo.has(sessionId)).toBe(false);
    expect(await repo.get(sessionId)).toBeUndefined();

    await repo.set(sessionId, sessionData);
    expect(await repo.has(sessionId)).toBe(true);

    const retrieved = await repo.get(sessionId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.query).toBe("Kerala");
    expect(retrieved?.history).toHaveLength(2);

    const deleted = await repo.delete(sessionId);
    expect(deleted).toBe(true);
    expect(await repo.has(sessionId)).toBe(false);

    await repo.set("s1", sessionData);
    await repo.set("s2", sessionData);
    expect(await repo.has("s1")).toBe(true);
    expect(await repo.has("s2")).toBe(true);

    await repo.clear();
    expect(await repo.has("s1")).toBe(false);
    expect(await repo.has("s2")).toBe(false);
  });

  it("should expire sessions after TTL duration", async () => {
    const repo = new InMemorySessionRepository();
    const sessionId = "sess-repo-expiry";
    const sessionData: Session = {
      id: sessionId,
      query: "Mock Query",
      history: [],
    };

    await repo.set(sessionId, sessionData);
    expect(await repo.has(sessionId)).toBe(true);

    const originalNow = Date.now;
    // Simulate moving time forward by 3 hours (greater than 2-hour TTL)
    Date.now = () => originalNow() + 3 * 60 * 60 * 1000;

    try {
      expect(await repo.has(sessionId)).toBe(false);
      expect(await repo.get(sessionId)).toBeUndefined();
    } finally {
      Date.now = originalNow;
    }
  });
});
