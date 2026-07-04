import { ISessionRepository } from "../repo/session.repo";
import { Session } from "../model/session.model";

export class SessionService {
  constructor(private repo: ISessionRepository) {}

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
    const session: Session = {
      id,
      query,
      history: [
        {
          role: "system",
          content: `You are 'Wayfinder AI', an enthusiastic, knowledgeable local guide for Indian cultural travel. \n` +
            `Your goal is to answer the user's questions about destinations, food, local customs, events, and folklore.\n` +
            `Be polite, immersive in your storytelling, and help the user connect deeply with local culture.\n` +
            `Keep responses engaging but concise. Avoid generic tourist traps; recommend authentic, respectful, and sustainable cultural engagement.\n` +
            `The user is currently asking about "${destination}". Below is the overview you generated:\n` +
            `- Attractions: ${attractionsTitle} - ${attractionsDesc}\n` +
            `- Hidden Gem: ${gemTitle} - ${gemDesc}\n` +
            `- Story: ${story}\n` +
            `- Event: ${eventTitle} - ${eventDesc}\n` +
            `Please use this context to answer follow-up questions from the user.`
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
