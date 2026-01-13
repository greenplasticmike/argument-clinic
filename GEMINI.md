# GEMINI.md

This file provides guidance to Gemini CLI when working with code in this repository.

## Overview

Argument Clinic is a persona-based conversation simulator using LLMs. Users create or select persona agents—representing historical figures, public personalities, or archetypes—and place them in an arena to discuss a topic. A neutral facilitator agent orchestrates the conversation, drawing out positions, building consensus where possible, and determining when the discussion has reached its natural conclusion.

Named after the Monty Python sketch, but the goal isn't combat—it's productive discourse.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **LLM Integration**: Multi-provider (Anthropic, OpenAI, etc.)—each agent can use a different model
- **Interfaces**: CLI (primary) and web UI

## Build & Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Run in development mode with watch
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

## Running Debates

**Quick demo** (Marx vs Wilde with custom topic):
```bash
npm start -- demo -t "Should AI be regulated?"
```

**Custom configuration**:
```bash
npm start -- run -c examples/philosophers.json
npm start -- run -c examples/tech-ethics.json
```

See `examples/` for sample config files showing persona setup.

## Core Concepts

### Persona Agents

Participants in the arena. Three types:
- **Historical/Famous**: Trained on public writings, speeches, interviews, historical record (Marx, Dorothy Parker, Oscar Wilde)
- **Public Profile**: Real people with available data—board members, executives, academics. Trained from writings, videos, public statements
- **Archetypes**: User-defined composite types (techbro, finance type, conservative hippie) for when specific training data isn't available

Each persona can use any LLM provider/model specified by the user.

### Arena & Facilitator

The facilitator agent is neutral and runs the conversation:
- Introduces the topic and draws out positions
- Ensures all participants are heard
- Verifies factual claims at agents' request
- Tracks strengths and weaknesses of each position as debate progresses
- **Scores each participant** on argument strength, persuasiveness, factual accuracy, and engagement (1-10)
- **Tracks position shifts**—when a participant changes their stance and what triggered it
- **Records concessions**—points each participant has conceded
- Builds consensus where possible—not every discussion needs a winner
- Determines when the debate has run its logical course
- Produces a summary of key arguments and positions

### Conversation Flow

1. User creates/selects persona agents and assigns LLM models
2. User provides a topic
3. Facilitator runs the discussion, producing a dialog
4. **Transcript auto-saves** to `transcripts/` as markdown with timestamp
5. User reviews the transcript (includes scores, position shifts, concessions)
6. User may ask questions of participants, extending the debate
7. Facilitator provides final summary with position analysis

## Use Cases

- **Historical mashups**: What would Marx, Dorothy Parker, Jesus, and Oscar Wilde discuss?
- **Board simulations**: Preview how board members might respond to a proposal
- **Grant review preview**: Simulate reviewer feedback before submission
- **Professor grading**: Estimate how a specific professor might grade a paper (trained on their past feedback)
- **Argument testing**: See which arguments resonate with which personality types

## Architecture

```
src/
  cli/              # CLI commands and REPL
  web/              # Web interface
  core/
    persona.ts      # Persona agent definition and behavior
    arena.ts        # Arena orchestration
    facilitator.ts  # Facilitator agent logic
    transcript.ts   # Dialog tracking and export
  providers/        # LLM provider abstractions (anthropic, openai, etc.)
  training/         # Persona training data ingestion
  types/            # Shared TypeScript types
examples/           # Sample debate configurations
transcripts/        # Auto-saved debate transcripts (gitignored)
```

### Transcripts

All conversations auto-save to `transcripts/` directory as markdown files. Each transcript includes:
- Full dialog with timestamps
- **Position Analysis** per participant: core position, strengths, weaknesses
- **Scores**: argument strength, persuasiveness, factual accuracy, engagement (1-10 scale)
- **Position Shifts**: tracked with round number and triggering argument
- **Concessions**: points each participant has conceded
- **Facilitator Summary**: balanced recap of the discussion

Filename format: `YYYY-MM-DD_HH-MM-SS_topic-slug.md`

## Design Principles

- **Authentic voices**: Personas should sound like their source material, not generic LLM responses
- **Good faith discourse**: Agents are persuasive but accept reasonable counter-arguments—no digging in against all reality
- **Consensus over combat**: The goal is productive conversation, not rhetorical destruction
- **Model flexibility**: Any persona can use any LLM—enables interesting cross-model dynamics
- **Extensible training**: Easy to add new personas from various source types (text, video transcripts, graded papers)
