---
name: deck-to-slides
description: Generate presentation slide images from a markdown deck file using AI image generation (Gemini via OpenRouter). Use this skill when the user wants to turn a markdown deck, slide outline, or presentation brief into actual slide images, or when they mention generating slides, creating a slide deck from text, or image generation for presentations. Also use when the user references OpenRouter, Gemini image generation, or wants to create visual slides from written content.
---

# Deck-to-Slides: AI Image Generation for Presentation Decks

Turn a markdown deck file into a set of AI-generated presentation slide images using Google's Gemini image model via OpenRouter.

## Output Layout

Unless the user specifies otherwise, all outputs go **side-by-side with the input deck file**. For a deck at `project/deck.md`, the result looks like:

```
project/
  deck.md          ← input
  deck.pptx        ← PowerPoint export
  deck.html        ← HTML presentation export
  slides/          ← individual slide images
    slide-1.png
    slide-2.jpg
    ...
```

Intermediate/working files (prompts, bootstrap variants, exemplar) use a temp directory and are cleaned up after export, unless the user wants to keep them.

## Setup

Before first use, install script dependencies:

```bash
cd <skill-path>/scripts && bun install
```

The scripts that call the OpenRouter API (`bootstrap.ts`, `generate.ts`) need `OPENROUTER_API_KEY`. A key may already be configured in `<skill-path>/scripts/.env` — check there first. Those `bun run` commands must include `--env-file <skill-path>/scripts/.env` so the key is loaded automatically.

If `<skill-path>/scripts/.env` doesn't exist or doesn't contain `OPENROUTER_API_KEY`, ask the user for their OpenRouter API key and create it:
```
OPENROUTER_API_KEY=sk-or-...
```

## How It Works

Four phases: **Parse**, **Bootstrap**, **Generate**, **Export**. All scripts take explicit input/output paths.

### Phase 1: Parse the Deck (Claude does this)

Read the user's deck markdown file and write two things into a working `prompts/` directory:

1. **`prompts/brief.md`** — artistic brief / visual system applying to ALL slides (colors with hex values, typography, layout rules, what NOT to do, recurring elements like footers and quote cards)
2. **`prompts/slide-N.md`** — one file per slide, self-contained image generation prompt

### Phase 2: Bootstrap (3 variants, pick best)

```bash
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/bootstrap.ts <slide-number> <prompts-dir> <out-dir>
```

Example — bootstrap slide 1, writing variants next to the deck:
```bash
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/bootstrap.ts 1 ./prompts ./bootstrap
```

Show all 3 variants to the user. They pick the best. Then:

```bash
bun run <skill-path>/scripts/select.ts ./bootstrap/variant-2.png ./exemplar.png
```

### Phase 3: Generate All Slides

```bash
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/generate.ts <prompts-dir> <slides-out-dir> [exemplar-path] [slide-numbers...]
```

Examples:
```bash
# All slides, with one-shot exemplar, output beside the deck
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/generate.ts ./prompts ./slides ./exemplar.png

# Just slides 3 and 5
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/generate.ts ./prompts ./slides ./exemplar.png 3 5

# Without exemplar (zero-shot)
bun --env-file <skill-path>/scripts/.env run <skill-path>/scripts/generate.ts ./prompts ./slides
```

### Phase 4: Export

```bash
bun run <skill-path>/scripts/export-pptx.ts <slides-dir> <out.pptx>
bun run <skill-path>/scripts/export-html.ts <slides-dir> <out.html>
```

Example:
```bash
bun run <skill-path>/scripts/export-pptx.ts ./slides ./deck.pptx
bun run <skill-path>/scripts/export-html.ts ./slides ./deck.html
```

Then clean up working files:
```bash
rm -rf ./prompts ./bootstrap ./exemplar.png
```

## Thinking in the Medium

Image generation produces slides that are fundamentally different from PowerPoint. Understanding what the medium unlocks helps you (and the user) make better creative decisions.

**The slide is an image, not a layout.** PowerPoint composes rectangles — text boxes, image containers, shape primitives. Image generation composes a single unified visual field. Text, imagery, and structure are rendered together as one surface. Labels can sit naturally inside a diagram, a title can emerge from negative space, annotations can feel like handwriting on a blueprint. There's no "text layer floating over background layer."

**Visual metaphor carries the argument.** Instead of illustrating a concept with a stock photo placed next to bullet points, the metaphor *is* the slide. A geological cross-section can encode time. A network diagram can encode relationships. A city skyline can encode scale. An architectural blueprint can encode planning. The model can render these as rich, detailed compositions that would require a professional illustrator in the PowerPoint world.

**Style is a first-class creative decision.** Every slide deck has an implicit visual style — usually "default corporate template." With image generation, style becomes an active choice that communicates. Scientific illustration signals rigor. Loose ink sketches signal early-stage thinking. Clean vector graphics signal precision. Watercolor washes signal warmth. Woodcut aesthetics signal craft and history. Name the style explicitly — reference specific artists, publications, design movements, or illustration traditions.

**Organic and handmade qualities are easy.** Subtle irregularity, hand-drawn line quality, naturalistic variation, textured surfaces — all the things that make a visual feel human and crafted — are trivial for image generation and nearly impossible in slide software. Lean into this. Specify "subtle organic irregularity" or "as if drawn with a confident pen" or "the controlled imperfection of a letterpress print."

**Fewer words, more visual weight.** A generated slide is a backdrop for a live speaker, not a document. Aim for 5-30 words on screen. Let the visual do the work of orienting the audience, establishing mood, and encoding structure. The speaker provides the detail.

## Writing Good Briefs and Prompts

The brief and per-slide prompts are the most important inputs. The user may arrive with polished prompts, a rough outline, or just a topic — meet them where they are.

### Brief (artistic system for the whole deck)

A good brief:

- **States the aesthetic in concrete terms** — name reference artists, publications, or design styles
- **Specifies exact colors** with hex values and strict role assignments
- **Defines typography modes** — what font style for titles vs body vs accents
- **Describes what it is NOT** — explicitly forbid common AI failure modes (wobbly lines, fake textures, clip art, corporate gradients)
- **Limits decorative elements** — specify a percentage of visual surface area (e.g., "~15%, not 80%")
- **Defines recurring elements** — footer format, quote card format, any branded objects

### Per-slide prompts

Each slide prompt should:

- Start with the slide title and a one-sentence role description
- Specify layout zones (e.g., "left 55%, right 40%")
- List all text content verbatim — the model renders exactly what you write
- Describe accent elements specifically for this slide
- End with "key notes" about what matters most visually

### Prompt craft principles

These principles make the difference between prompts that produce what you want and prompts that produce plausible-looking wrong answers:

- **Describe the visible result, not the construction process.** Don't say "imagine X, then apply transformation Y." Say what the finished image looks like. The model renders from descriptions of outcomes, not from geometric construction steps.

- **Describe the experience at two distances.** A good prompt says what the viewer sees from across the room vs up close. "From across the room it reads as three clusters connected by fine lines; up close each cluster reveals specific project names." This dual-distance thinking produces better compositions than pure spatial specification.

- **Say what it must not become.** Image generators have default tendencies — glossy corporate aesthetics, clip art symbology, overcrowded compositions, photorealistic textures where abstraction was intended. An explicit "what to avoid" section prevents the most common failure modes and is as important as the positive description.

- **Use dramatic differences, not subtle ones.** Small distinctions ("5px vs 7px") are invisible to the model. Describe differences that are obvious from across a room, using ratios or physical analogies ("fingertip-width vs fist-width"). If the difference isn't dramatic, it won't render.

- **State spatial relationships as percentages.** "Positioned at approximately 42% from left, 52% from top" is more reliable than "slightly left of center." Percentages are unambiguous.

- **Specify all on-screen text verbatim.** The model renders exactly what you write. Don't paraphrase or summarize — provide the literal strings.

## Troubleshooting

- **"No image found in response"** — The model returned text-only. Try shortening the slide prompt.
- **Inconsistent style** — Re-bootstrap and pick a stronger exemplar.
- **Wrong aspect ratio** — Scripts default to 16:9. Edit `api.ts` to change `aspect_ratio`.
