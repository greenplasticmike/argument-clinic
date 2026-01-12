import type { Transcript, Message } from "../types/index.js";

/** Format a transcript as plain text */
export function formatTranscriptText(transcript: Transcript): string {
  const lines: string[] = [
    `# ${transcript.topic}`,
    "",
    `Started: ${transcript.startedAt.toISOString()}`,
    `Status: ${transcript.status}`,
    "",
    "## Participants",
    ...transcript.personas.map((p) => `- **${p.name}**: ${p.description}`),
    "",
    "## Discussion",
    "",
  ];

  for (const message of transcript.messages) {
    lines.push(`**${message.speakerName}**: ${message.content}`);
    lines.push("");
  }

  if (transcript.positions.length > 0) {
    lines.push("## Position Summary");
    lines.push("");
    for (const pos of transcript.positions) {
      if (pos.corePosition) {
        lines.push(`### ${pos.personaName}`);
        lines.push(`Position: ${pos.corePosition}`);
        if (pos.strengths.length > 0) {
          lines.push(`Strengths: ${pos.strengths.join("; ")}`);
        }
        if (pos.weaknesses.length > 0) {
          lines.push(`Weaknesses: ${pos.weaknesses.join("; ")}`);
        }
        if (pos.concessions.length > 0) {
          lines.push(`Concessions: ${pos.concessions.join("; ")}`);
        }
        lines.push("");
      }
    }
  }

  if (transcript.summary) {
    lines.push("## Summary");
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
