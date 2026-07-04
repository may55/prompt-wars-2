export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Session {
  id: string;
  query: string;
  history: ChatMessage[];
}
