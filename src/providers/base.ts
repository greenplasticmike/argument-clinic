import type { Message, ProviderConfig } from "../types/index.js";

/** Base interface for LLM providers */
export interface LLMProvider {
  readonly name: string;
  readonly model: string;

  /** Generate a response given conversation history and system prompt */
  generateResponse(
    systemPrompt: string,
    messages: Message[],
    speakerId: string
  ): Promise<string>;
}

/** Create an LLM provider from config */
export async function createProvider(
  config: ProviderConfig
): Promise<LLMProvider> {
  switch (config.provider) {
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic.js");
      return new AnthropicProvider(config);
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai.js");
      return new OpenAIProvider(config);
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
