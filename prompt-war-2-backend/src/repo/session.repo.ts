import { Session } from "../model/session.model";

export interface ISessionRepository {
  get(id: string): Promise<Session | undefined>;
  set(id: string, session: Session): Promise<void>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

interface SessionEntry {
  session: Session;
  expiresAt: number;
}

export class InMemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, SessionEntry>();
  private static readonly TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    if (typeof setInterval !== "undefined") {
      const interval = setInterval(() => this.cleanupExpired(), 10 * 60 * 1000);
      if (interval && typeof interval.unref === "function") {
        interval.unref();
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.sessions.entries()) {
      if (now > entry.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }

  async get(id: string): Promise<Session | undefined> {
    const entry = this.sessions.get(id);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(id);
      return undefined;
    }

    // Sliding window: slide expiration on access
    entry.expiresAt = Date.now() + InMemorySessionRepository.TTL_MS;
    return entry.session;
  }

  async set(id: string, session: Session): Promise<void> {
    this.sessions.set(id, {
      session,
      expiresAt: Date.now() + InMemorySessionRepository.TTL_MS,
    });
  }

  async has(id: string): Promise<boolean> {
    const entry = this.sessions.get(id);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(id);
      return false;
    }
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }
}
