import type { Transcript, Message, ArgumentScores } from "../types/index.js";

/** Format scores as a readable string */
function formatScores(scores: ArgumentScores): string {
  return `Argument: ${scores.argumentStrength}/10 | Persuasiveness: ${scores.persuasiveness}/10 | Accuracy: ${scores.factualAccuracy}/10 | Engagement: ${scores.engagement}/10`;
}

/** Format a transcript as plain text */
export function formatTranscriptText(transcript: Transcript): string {
  const lines: string[] = [
    `# ${transcript.topic}`,
    "",
    `**Started:** ${transcript.startedAt.toISOString()}`,
    `**Status:** ${transcript.status}`,
    transcript.endedAt ? `**Ended:** ${transcript.endedAt.toISOString()}` : "",
    "",
    "## Participants",
    ...transcript.personas.map((p) => `- **${p.name}**: ${p.description}`),
    "",
    "## Discussion",
    "",
  ].filter(Boolean);

  for (const message of transcript.messages) {
    lines.push(`**${message.speakerName}**: ${message.content}`);
    lines.push("");
  }

  if (transcript.positions.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Position Analysis");
    lines.push("");
    for (const pos of transcript.positions) {
      if (pos.corePosition) {
        lines.push(`### ${pos.personaName}`);
        lines.push("");
        lines.push(`**Core Position:** ${pos.corePosition}`);
        lines.push("");
        lines.push(`**Scores:** ${formatScores(pos.scores)}`);
        lines.push("");
        if (pos.strengths.length > 0) {
          lines.push("**Strengths:**");
          for (const s of pos.strengths) {
            lines.push(`- ${s}`);
          }
          lines.push("");
        }
        if (pos.weaknesses.length > 0) {
          lines.push("**Weaknesses:**");
          for (const w of pos.weaknesses) {
            lines.push(`- ${w}`);
          }
          lines.push("");
        }
        if (pos.concessions.length > 0) {
          lines.push("**Concessions Made:**");
          for (const c of pos.concessions) {
            lines.push(`- ${c}`);
          }
          lines.push("");
        }
        if (pos.positionShifts && pos.positionShifts.length > 0) {
          lines.push("**Position Shifts:**");
          for (const shift of pos.positionShifts) {
            lines.push(`- Round ${shift.round}: "${shift.previousPosition}" → "${shift.newPosition}"`);
            lines.push(`  - Triggered by: ${shift.trigger}`);
          }
          lines.push("");
        }
      }
    }
  }

  if (transcript.summary) {
    lines.push("---");
    lines.push("");
    lines.push("## Facilitator Summary");
    lines.push("");
    lines.push(transcript.summary);
  }

  return lines.join("\n");
}

/** Format a transcript as JSON */
export function formatTranscriptJSON(transcript: Transcript): string {
  return JSON.stringify(transcript, null, 2);
}

/** Format a single message for display */
export function formatMessage(message: Message): string {
  return `[${message.speakerName}]: ${message.content}`;
}

/** Save transcript to a file */
export async function saveTranscript(
  transcript: Transcript,
  path: string,
  format: "text" | "json" = "text"
): Promise<void> {
  const { writeFile } = await import("fs/promises");
  const content =
    format === "json"
      ? formatTranscriptJSON(transcript)
      : formatTranscriptText(transcript);
  await writeFile(path, content, "utf-8");
}
