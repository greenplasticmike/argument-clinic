import type {
  ArenaConfig,
  ArgumentScores,
  Message,
  PersonaDefinition,
  PositionShift,
  PositionSummary,
} from "../types/index.js";
import { createProvider, type LLMProvider } from "../providers/index.js";

/** Default scores for a new participant */
function defaultScores(): ArgumentScores {
  return {
    argumentStrength: 5,
    persuasiveness: 5,
    factualAccuracy: 5,
    engagement: 5,
  };
}

/** The facilitator agent that orchestrates conversations */
export class Facilitator {
  private provider: LLMProvider | null = null;
  private config: ArenaConfig;
  private personas: PersonaDefinition[] = [];
  private positions: Map<string, PositionSummary> = new Map();
  private roundCount: number = 0;

  constructor(config: ArenaConfig) {
    this.config = config;
  }

  /** Initialize the facilitator */
  async initialize(): Promise<void> {
    this.provider = await createProvider(this.config.facilitatorConfig);
  }

  /** Set the personas participating in this conversation */
  setPersonas(personas: PersonaDefinition[]): void {
    this.personas = personas;
    for (const p of personas) {
      this.positions.set(p.id, {
        personaId: p.id,
        personaName: p.name,
        corePosition: "",
        strengths: [],
        weaknesses: [],
        concessions: [],
        scores: defaultScores(),
        positionShifts: [],
      });
    }
  }

  /** Build the system prompt for the facilitator */
  private buildSystemPrompt(): string {
    const participantList = this.personas
      .map((p) => `- ${p.name}: ${p.description}`)
      .join("\n");

    return `You are a neutral facilitator for a conversation about: "${this.config.topic}"

${this.config.context ? `Context: ${this.config.context}\n` : ""}
Participants:
${participantList}

Your role:
- Guide the discussion productively without taking sides
- Draw out each participant's position and reasoning
- Ensure all participants have a chance to speak
- Identify areas of agreement and disagreement
- Ask clarifying questions when positions are unclear
- Verify factual claims when requested by participants
- Build toward consensus where possible—not every discussion needs a winner
- Recognize when the debate has reached its natural conclusion

When you speak, address participants directly. Keep your interventions focused and minimal—you're facilitating, not dominating.

Format your responses as plain dialogue. Do not include stage directions or meta-commentary.`;
  }

  /** Generate the opening statement */
  async openDiscussion(): Promise<string> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    const prompt = `${this.buildSystemPrompt()}

Generate a brief opening statement that:
1. Introduces the topic
2. Welcomes the participants
3. Invites the first participant to share their initial thoughts`;

    return this.provider.generateResponse(prompt, [], "facilitator");
  }

  /** Generate a facilitation response */
  async facilitate(conversationHistory: Message[]): Promise<string> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    return this.provider.generateResponse(
      this.buildSystemPrompt(),
      conversationHistory,
      "facilitator"
    );
  }

  /** Decide which persona should speak next */
  async selectNextSpeaker(
    conversationHistory: Message[]
  ): Promise<string | null> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    const recentSpeakers = conversationHistory
      .slice(-5)
      .map((m) => m.speakerId)
      .filter((id) => id !== "facilitator" && id !== "user");

    const personaNames = this.personas.map((p) => p.name).join(", ");

    const prompt = `${this.buildSystemPrompt()}

Based on the conversation so far, who should speak next?
Available participants: ${personaNames}
Recent speakers: ${recentSpeakers.join(", ") || "none yet"}

Consider:
- Who hasn't had a chance to respond to recent points?
- Who was directly addressed or challenged?
- Who would have the most relevant perspective to add?

Respond with ONLY the name of the next speaker, nothing else.`;

    const response = await this.provider.generateResponse(
      prompt,
      conversationHistory,
      "facilitator"
    );

    const selectedName = response.trim();
    const selected = this.personas.find(
      (p) => p.name.toLowerCase() === selectedName.toLowerCase()
    );
    return selected?.id ?? null;
  }

  /** Check if the discussion should conclude */
  async shouldConclude(conversationHistory: Message[]): Promise<boolean> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    if (conversationHistory.length < 6) {
      return false; // Too early to conclude
    }

    const prompt = `${this.buildSystemPrompt()}

Analyze this conversation. Has it reached a natural conclusion? Consider:
- Have all major arguments been made and addressed?
- Are participants repeating themselves?
- Has meaningful consensus been reached, or is it clear none will be?
- Would continuing add value?

Respond with ONLY "yes" or "no".`;

    const response = await this.provider.generateResponse(
      prompt,
      conversationHistory,
      "facilitator"
    );

    return response.trim().toLowerCase() === "yes";
  }

  /** Generate a closing summary */
  async summarize(conversationHistory: Message[]): Promise<string> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    const prompt = `${this.buildSystemPrompt()}

The discussion is concluding. Provide a summary that:
1. Recaps the main positions taken by each participant
2. Identifies key points of agreement
3. Notes remaining disagreements and their core tensions
4. Highlights the strongest arguments made
5. Notes any concessions or shifts in position

Be fair and balanced. This is a summary, not a judgment.`;

    return this.provider.generateResponse(
      prompt,
      conversationHistory,
      "facilitator"
    );
  }

  /** Analyze positions, scores, and shifts after a round */
  async analyzePositions(conversationHistory: Message[]): Promise<void> {
    if (!this.provider) {
      throw new Error("Facilitator not initialized");
    }

    this.roundCount++;

    const personaNames = this.personas.map((p) => `${p.id}: ${p.name}`).join(", ");
    const currentPositions = Array.from(this.positions.entries())
      .map(([id, pos]) => `${pos.personaName}: "${pos.corePosition || "not yet established"}"`)
      .join("\n");

    const prompt = `${this.buildSystemPrompt()}

Analyze the current state of the debate. For each participant, provide a JSON analysis.

Participants: ${personaNames}

Current known positions:
${currentPositions}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "analyses": [
    {
      "personaId": "id",
      "corePosition": "their main thesis in one sentence",
      "strengths": ["strong point 1", "strong point 2"],
      "weaknesses": ["weak point 1"],
      "concessions": ["any points they conceded"],
      "scores": {
        "argumentStrength": 7,
        "persuasiveness": 8,
        "factualAccuracy": 6,
        "engagement": 7
      },
      "positionShifted": false,
      "shiftDetails": null
    }
  ]
}

For positionShifted, set to true only if a participant meaningfully changed their stance from their previous position. If true, include shiftDetails as {"previousPosition": "...", "newPosition": "...", "trigger": "what argument caused it"}.

Scores are 1-10 where:
- argumentStrength: logical validity, quality of evidence and reasoning
- persuasiveness: rhetorical effectiveness, emotional resonance
- factualAccuracy: accuracy of claims, proper use of facts/history
- engagement: quality of responses to counterarguments, listening`;

    try {
      const response = await this.provider.generateResponse(
        prompt,
        conversationHistory,
        "facilitator"
      );

      // Parse the JSON response
      const parsed = JSON.parse(response.trim());

      for (const analysis of parsed.analyses) {
        const existing = this.positions.get(analysis.personaId);
        if (!existing) continue;

        // Update position data
        existing.corePosition = analysis.corePosition;
        existing.strengths = analysis.strengths || [];
        existing.weaknesses = analysis.weaknesses || [];
        existing.concessions = analysis.concessions || [];
        existing.scores = analysis.scores;

        // Track position shift if it occurred
        if (analysis.positionShifted && analysis.shiftDetails) {
          const shift: PositionShift = {
            round: this.roundCount,
            previousPosition: analysis.shiftDetails.previousPosition,
            newPosition: analysis.shiftDetails.newPosition,
            trigger: analysis.shiftDetails.trigger,
          };
          existing.positionShifts.push(shift);
        }
      }
    } catch (error) {
      // If JSON parsing fails, log but don't crash
      console.error("Failed to parse position analysis:", error);
    }
  }

  /** Get current position summaries */
  getPositions(): PositionSummary[] {
    return Array.from(this.positions.values());
  }
}
