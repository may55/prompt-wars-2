import { ISessionRepository } from "../repo/session.repo";
import { Session } from "../model/session.model";

export class SessionService {
  constructor(
    private repo: ISessionRepository,
    private chatPromptTemplate: string
  ) {}

  async getSession(id: string): Promise<Session | undefined> {
    return this.repo.get(id);
  }

  async createSession(
    id: string,
    query: string,
    destination: string,
    attractionsTitle: string,
    attractionsDesc: string,
    gemTitle: string,
    gemDesc: string,
    story: string,
    eventTitle: string,
    eventDesc: string
  ): Promise<Session> {
    const systemPromptContent = this.chatPromptTemplate
      .replaceAll("{{destination}}", destination)
      .replaceAll("{{attractionsTitle}}", attractionsTitle)
      .replaceAll("{{attractionsDesc}}", attractionsDesc)
      .replaceAll("{{gemTitle}}", gemTitle)
      .replaceAll("{{gemDesc}}", gemDesc)
      .replaceAll("{{story}}", story)
      .replaceAll("{{eventTitle}}", eventTitle)
      .replaceAll("{{eventDesc}}", eventDesc);

    const session: Session = {
      id,
      query,
      history: [
        {
          role: "system",
          content: systemPromptContent
        },
        { role: "user", content: `Tell me about: ${query}` },
        {
          role: "assistant",
          content: `I have discovered details about ${destination}. I've shared some highlights regarding its attractions, hidden gems, stories, and cultural events. What would you like to explore further?`
        }
      ],
    };
    await this.repo.set(id, session);
    return session;
  }

  async addMessageToSession(id: string, role: "user" | "assistant", content: string): Promise<Session> {
    const session = await this.repo.get(id);
    if (!session) {
      throw new Error("Active session not found or session has expired");
    }
    session.history.push({ role, content });
    await this.repo.set(id, session);
    return session;
  }
}
