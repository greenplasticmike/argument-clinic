import type { PersonaDefinition, Message } from "../types/index.js";
import { createProvider, type LLMProvider } from "../providers/index.js";

/** A persona agent that participates in conversations */
export class Persona {
  readonly definition: PersonaDefinition;
  private provider: LLMProvider | null = null;

  constructor(definition: PersonaDefinition) {
    this.definition = definition;
  }

  get id(): string {
    return this.definition.id;
  }

  get name(): string {
    return this.definition.name;
  }

  /** Initialize the LLM provider */
  async initialize(): Promise<void> {
    this.provider = await createProvider(this.definition.providerConfig);
  }

  /** Build the system prompt for this persona */
  private buildSystemPrompt(): string {
    const parts: string[] = [
      `You are ${this.definition.name}.`,
      this.definition.description,
    ];

    if (this.definition.background) {
      parts.push(`Background: ${this.definition.background}`);
    }

    parts.push(
      "",
      "Instructions:",
      "- Respond authentically as this person would, based on their known views, personality, and communication style.",
      "- Engage thoughtfully with other participants' arguments.",
      "- Be persuasive but intellectually honest—acknowledge good points even from those you disagree with.",
      "- Do not break character or refer to yourself as an AI.",
      "- Keep responses focused and conversational.",
      "- Respond only with your dialogue—no stage directions or meta-commentary."
    );

    return parts.join("\n");
  }

  /** Generate a response in this persona's voice */
  async respond(conversationHistory: Message[]): Promise<string> {
    if (!this.provider) {
      throw new Error(`Persona ${this.name} not initialized`);
    }

    const systemPrompt = this.buildSystemPrompt();
    return this.provider.generateResponse(
      systemPrompt,
      conversationHistory,
      this.id
    );
  }
}

/** Create a persona from a definition */
export async function createPersona(
  definition: PersonaDefinition
): Promise<Persona> {
  const persona = new Persona(definition);
  await persona.initialize();
  return persona;
}
