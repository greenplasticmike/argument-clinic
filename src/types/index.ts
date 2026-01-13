/** LLM provider configuration */
export interface ProviderConfig {
  provider: "anthropic" | "openai";
  model: string;
  apiKey?: string; // Falls back to environment variable
}

/** Source material for training a persona */
export interface TrainingSource {
  type: "text" | "url" | "file";
  content: string;
  description?: string;
}

/** Persona definition */
export interface PersonaDefinition {
  id: string;
  name: string;
  type: "historical" | "public" | "archetype";
  description: string;
  background?: string;
  trainingSources?: TrainingSource[];
  providerConfig: ProviderConfig;
}

/** A single message in the conversation */
export interface Message {
  id: string;
  speakerId: string; // Persona ID or "facilitator" or "user"
  speakerName: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Scores for evaluating argument quality */
export interface ArgumentScores {
  argumentStrength: number; // 1-10: logical validity, evidence quality
  persuasiveness: number; // 1-10: rhetorical effectiveness
  factualAccuracy: number; // 1-10: accuracy of claims made
  engagement: number; // 1-10: quality of responses to counterarguments
}

/** A position shift event */
export interface PositionShift {
  round: number;
  previousPosition: string;
  newPosition: string;
  trigger: string; // What argument caused the shift
}

/** Position tracking for a persona during debate */
export interface PositionSummary {
  personaId: string;
  personaName: string;
  corePosition: string;
  strengths: string[];
  weaknesses: string[];
  concessions: string[]; // Points they've conceded
  scores: ArgumentScores;
  positionShifts: PositionShift[]; // Track when positions change
}

/** Arena configuration */
export interface ArenaConfig {
  topic: string;
  context?: string;
  maxRounds?: number;
  facilitatorConfig: ProviderConfig;
}

/** Full transcript of a conversation */
export interface Transcript {
  id: string;
  topic: string;
  personas: PersonaDefinition[];
  messages: Message[];
  positions: PositionSummary[];
  status: "active" | "concluded" | "paused";
  startedAt: Date;
  endedAt?: Date;
  summary?: string;
}
