import OpenAI from "openai";
import type { Message, ProviderConfig } from "../types/index.js";
import type { LLMProvider } from "./base.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly model: string;
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(
    systemPrompt: string,
    messages: Message[],
    speakerId: string
  ): Promise<string> {
    const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: (m.speakerId === speakerId ? "assistant" : "user") as
          | "user"
          | "assistant",
        content: `[${m.speakerName}]: ${m.content}`,
      })),
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
