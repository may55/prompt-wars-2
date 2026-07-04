import { Session } from "../model/session.model";

export interface ISessionRepository {
  get(id: string): Promise<Session | undefined>;
  set(id: string, session: Session): Promise<void>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class InMemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, Session>();

  async get(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async set(id: string, session: Session): Promise<void> {
    this.sessions.set(id, session);
  }

  async has(id: string): Promise<boolean> {
    return this.sessions.has(id);
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }
}
