import { randomUUID } from "crypto";
import type {
  ArenaConfig,
  Message,
  PersonaDefinition,
  Transcript,
} from "../types/index.js";
import { Persona, createPersona } from "./persona.js";
import { Facilitator } from "./facilitator.js";

export interface ArenaEvents {
  onMessage?: (message: Message) => void;
  onStatusChange?: (status: Transcript["status"]) => void;
}

/** The arena where personas engage in conversation */
export class Arena {
  private config: ArenaConfig;
  private facilitator: Facilitator;
  private personas: Map<string, Persona> = new Map();
  private messages: Message[] = [];
  private status: Transcript["status"] = "active";
  private events: ArenaEvents;
  private startedAt: Date;
  private transcriptId: string;

  constructor(config: ArenaConfig, events: ArenaEvents = {}) {
    this.config = config;
    this.facilitator = new Facilitator(config);
    this.events = events;
    this.startedAt = new Date();
    this.transcriptId = randomUUID();
  }

  /** Add a persona to the arena */
  async addPersona(definition: PersonaDefinition): Promise<void> {
    const persona = await createPersona(definition);
    this.personas.set(persona.id, persona);
  }

  /** Initialize the arena and start the conversation */
  async initialize(): Promise<void> {
    await this.facilitator.initialize();
    this.facilitator.setPersonas(
      Array.from(this.personas.values()).map((p) => p.definition)
    );
  }

  /** Add a message to the transcript */
  private addMessage(
    speakerId: string,
    speakerName: string,
    content: string
  ): Message {
    const message: Message = {
      id: randomUUID(),
      speakerId,
      speakerName,
      content,
      timestamp: new Date(),
    };
    this.messages.push(message);
    this.events.onMessage?.(message);
    return message;
  }

  /** Run the opening of the discussion */
  async open(): Promise<Message> {
    const opening = await this.facilitator.openDiscussion();
    return this.addMessage("facilitator", "Facilitator", opening);
  }

  /** Run a single round of discussion */
  async runRound(): Promise<Message[]> {
    const roundMessages: Message[] = [];

    // Facilitator selects next speaker
    const nextSpeakerId = await this.facilitator.selectNextSpeaker(
      this.messages
    );

    if (!nextSpeakerId) {
      // Facilitator speaks to move things along
      const facilitation = await this.facilitator.facilitate(this.messages);
      roundMessages.push(
        this.addMessage("facilitator", "Facilitator", facilitation)
      );
      return roundMessages;
    }

    const persona = this.personas.get(nextSpeakerId);
    if (!persona) {
      throw new Error(`Unknown persona: ${nextSpeakerId}`);
    }

    // Persona responds
    const response = await persona.respond(this.messages);
    roundMessages.push(this.addMessage(persona.id, persona.name, response));

    return roundMessages;
  }

  /** Check if the discussion should end */
  async shouldEnd(): Promise<boolean> {
    if (this.config.maxRounds && this.messages.length >= this.config.maxRounds) {
      return true;
    }
    return this.facilitator.shouldConclude(this.messages);
  }

  /** End the discussion and get summary */
  async conclude(): Promise<Message> {
    const summary = await this.facilitator.summarize(this.messages);
    const message = this.addMessage("facilitator", "Facilitator", summary);
    this.status = "concluded";
    this.events.onStatusChange?.(this.status);
    return message;
  }

  /** Allow user to ask a question */
  async userQuestion(question: string): Promise<Message[]> {
    const userMessage = this.addMessage("user", "User", question);
    const responses: Message[] = [userMessage];

    // Facilitator may direct the question or respond
    const facilitation = await this.facilitator.facilitate(this.messages);
    responses.push(
      this.addMessage("facilitator", "Facilitator", facilitation)
    );

    // Relevant persona(s) respond
    const nextSpeakerId = await this.facilitator.selectNextSpeaker(
      this.messages
    );
    if (nextSpeakerId) {
      const persona = this.personas.get(nextSpeakerId);
      if (persona) {
        const response = await persona.respond(this.messages);
        responses.push(this.addMessage(persona.id, persona.name, response));
      }
    }

    // Reactivate if concluded
    if (this.status === "concluded") {
      this.status = "active";
      this.events.onStatusChange?.(this.status);
    }

    return responses;
  }

  /** Get the current transcript */
  getTranscript(): Transcript {
    return {
      id: this.transcriptId,
      topic: this.config.topic,
      personas: Array.from(this.personas.values()).map((p) => p.definition),
      messages: [...this.messages],
      positions: this.facilitator.getPositions(),
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.status === "concluded" ? new Date() : undefined,
    };
  }

  /** Run the full discussion automatically */
  async run(): Promise<Transcript> {
    await this.open();

    while (!(await this.shouldEnd())) {
      await this.runRound();
    }

    await this.conclude();
    return this.getTranscript();
  }
}
