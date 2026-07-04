import { AzureOpenAI } from "openai";
import { ChatMessage } from "../model/session.model";

export interface IOpenAIService {
  callAzureOpenAI(messages: ChatMessage[], responseJson?: boolean): Promise<string>;
}

export class OpenAIService implements IOpenAIService {
  private client: AzureOpenAI;

  constructor(endpoint: string, apiKey: string, apiVersion: string, deployment: string) {
    this.client = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
      deployment,
    });
  }

  async callAzureOpenAI(messages: ChatMessage[], responseJson = false): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "", // Ignored by Azure but required by the TypeScript typings
      messages: messages as any,
      response_format: responseJson ? { type: "json_object" } : undefined,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Azure OpenAI");
    }

    return content;
  }
}
