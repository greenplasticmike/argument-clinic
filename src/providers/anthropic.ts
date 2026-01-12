import Anthropic from "@anthropic-ai/sdk";
import type { Message, ProviderConfig } from "../types/index.js";
import type { LLMProvider } from "./base.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateResponse(
    systemPrompt: string,
    messages: Message[],
    speakerId: string
  ): Promise<string> {
    const formattedMessages = messages.map((m) => ({
      role: (m.speakerId === speakerId ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: `[${m.speakerName}]: ${m.content}`,
    }));

    // Ensure we don't start with assistant message
    if (formattedMessages.length > 0 && formattedMessages[0].role === "assistant") {
      formattedMessages[0].role = "user";
    }

    // Merge consecutive same-role messages
    const mergedMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const msg of formattedMessages) {
      const last = mergedMessages[mergedMessages.length - 1];
      if (last && last.role === msg.role) {
        last.content += "\n\n" + msg.content;
      } else {
        mergedMessages.push({ ...msg });
      }
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: mergedMessages.length > 0 ? mergedMessages : [{ role: "user", content: "Begin." }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  }
}
