#!/usr/bin/env node

import { Command } from "commander";
import { Arena } from "../core/index.js";
import { formatMessage, saveTranscript } from "../core/transcript.js";
import type { PersonaDefinition, ArenaConfig } from "../types/index.js";

const program = new Command();

program
  .name("argument-clinic")
  .description("Persona-based conversation simulator using LLMs")
  .version("0.1.0");

program
  .command("demo")
  .description("Run a demo conversation with preset personas")
  .option("-t, --topic <topic>", "Discussion topic", "What is the meaning of life?")
  .option("-o, --output <file>", "Save transcript to file")
  .option("--json", "Output as JSON instead of text")
  .action(async (options) => {
    console.log("Starting Argument Clinic demo...\n");

    // Demo personas
    const personas: PersonaDefinition[] = [
      {
        id: "marx",
        name: "Karl Marx",
        type: "historical",
        description:
          "German philosopher, economist, and socialist revolutionary. Author of Das Kapital and The Communist Manifesto.",
        background:
          "Views history through the lens of class struggle and material conditions. Advocates for the abolition of private property and worker ownership of the means of production.",
        providerConfig: {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
      },
      {
        id: "wilde",
        name: "Oscar Wilde",
        type: "historical",
        description:
          "Irish poet, playwright, and wit. Known for The Picture of Dorian Gray and The Importance of Being Earnest.",
        background:
          "Celebrated aesthete who championed art for art's sake. Sharp, epigrammatic conversationalist with a talent for paradox.",
        providerConfig: {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
        },
      },
    ];

    const arenaConfig: ArenaConfig = {
      topic: options.topic,
      maxRounds: 12,
      facilitatorConfig: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      },
    };

    const arena = new Arena(arenaConfig, {
      onMessage: (message) => {
        console.log(formatMessage(message));
        console.log();
      },
    });

    for (const persona of personas) {
      await arena.addPersona(persona);
    }

    await arena.initialize();

    try {
      const transcript = await arena.run();

      if (options.output) {
        const format = options.json ? "json" : "text";
        await saveTranscript(transcript, options.output, format);
        console.log(`\nTranscript saved to ${options.output}`);
      }
    } catch (error) {
      console.error("Error running conversation:", error);
      process.exit(1);
    }
  });

program
  .command("run")
  .description("Run a conversation with custom configuration")
  .requiredOption("-c, --config <file>", "Path to arena configuration JSON")
  .option("-o, --output <file>", "Save transcript to file")
  .option("--json", "Output as JSON instead of text")
  .action(async (options) => {
    const { readFile } = await import("fs/promises");

    try {
      const configContent = await readFile(options.config, "utf-8");
      const config = JSON.parse(configContent) as {
        arena: ArenaConfig;
        personas: PersonaDefinition[];
      };

      const arena = new Arena(config.arena, {
        onMessage: (message) => {
          console.log(formatMessage(message));
          console.log();
        },
      });

      for (const persona of config.personas) {
        await arena.addPersona(persona);
      }

      await arena.initialize();
      const transcript = await arena.run();

      if (options.output) {
        const format = options.json ? "json" : "text";
        await saveTranscript(transcript, options.output, format);
        console.log(`\nTranscript saved to ${options.output}`);
      }
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program.parse();
