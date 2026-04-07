# Sample Codex Progress Dashboard

A reference implementation of the babysit-codex progress visualization. Copy or adapt this for new babysitting sessions.

## What it does

- Renders a sunburst-style progress chart in the browser (D3 v7 from CDN, no build step)
- Polls `/tmp/codex-progress.json` every 5 seconds and re-renders
- Shows phase names, item completion, current activity, context remaining, and a timeline of milestones
- Tooltips on hover show per-phase task checklists

## Files

- `index.html` — self-contained dashboard (HTML + CSS + SVG via D3)
- `server.ts` — minimal Bun file server (port 8199) that serves `index.html` from this directory and live progress JSON from `/tmp/codex-progress.json`
- `progress.example.json` — example shape of the progress JSON the dashboard expects

## How to use

The dashboard runs in place from the skill directory. Only the progress JSON lives elsewhere (so the skill directory stays free of run-specific state).

1. Start the server (run in place — no need to copy anything):

   ```bash
   # Default: reads /tmp/codex-progress.json on port 8199
   bun run ~/.claude/skills/babysit-codex/references/sample-viz/server.ts &

   # Custom path:
   bun run ~/.claude/skills/babysit-codex/references/sample-viz/server.ts /tmp/my-run/progress.json &

   # Custom port via env:
   PORT=8200 bun run ~/.claude/skills/babysit-codex/references/sample-viz/server.ts &
   ```

2. Open http://localhost:8199 in a browser.

3. Write your live progress to the configured path. The dashboard auto-refreshes every 5 seconds.

## Progress JSON shape

See `progress.example.json` for a full example. Required fields:

```json
{
  "session": "codex-babysat",
  "model": "gpt-5.4 xhigh fast",
  "plan": "Plan name shown in header",
  "contextRemaining": "47%",
  "currentActivity": "What Codex is doing right now",
  "lastChecked": "just now",
  "phases": [
    {
      "id": "phase-1",
      "name": "Phase short name",
      "status": "done | in-progress | pending",
      "items": [
        { "task": "Item description", "done": true }
      ]
    }
  ],
  "timeline": [
    { "time": "now", "event": "Significant milestone" }
  ],
  "filesChanged": ["path/to/file.ts"]
}
```

## Updating the JSON

Either `cat > /tmp/codex-progress.json << 'EOF' ... EOF` or write programmatically. The babysit-codex skill instructs the babysitter to update the JSON on every monitoring cycle so the dashboard reflects reality.

## Customizing

The HTML is intentionally a single self-contained file so it's easy to fork. The chart, color palette, and layout are all in `index.html`. The server is ~30 lines and only needs Bun.
