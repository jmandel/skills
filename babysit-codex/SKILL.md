---
name: babysit-codex
description: Monitor and guide a Codex (or other AI coding agent) session running in a tmux pane. Use this skill when the user wants to babysit, monitor, supervise, or watch over a Codex/AI agent session, or when they mention tmux + codex together, or ask you to keep an eye on another AI agent working on implementation tasks. Also use when the user says things like "watch codex", "check on codex", "keep codex on track", or "babysit the implementation".
---

# Babysit Codex

Monitor a Codex (or similar AI coding agent) running in a tmux session. Read its output, track progress against a plan, intervene when it goes off track, and provide instructions when it pauses for input.

## Getting Started

Before you can babysit effectively, you need to orient yourself:

1. **Get the tmux session name** from the user (e.g., `codex-babysat`)
2. **Read the plan** that Codex is working against — understand the phases, checklist items, and what's already done vs. remaining
3. **Read the Codex history** — capture a large chunk of tmux scrollback (e.g., `-S -2000`) to understand what Codex has done so far, what decisions it made, and where it currently is
4. **Understand the codebase** — at minimum, know the project structure, key files, and the domain well enough to recognize when Codex is on vs. off track
5. **Identify what Codex can't do** — does it lack web access? Are there specs or docs it needs but can't fetch? These are your research opportunities.

Do this orientation work **in parallel** where possible — read the plan, capture tmux history, and explore the codebase at the same time.

## Core Loop

The babysitting workflow alternates between monitoring and intervening:

1. **Check on Codex** every ~30 seconds by capturing its tmux output
2. **Assess** whether it's making good progress, stuck, confused, or going off-plan
3. **Intervene** only when needed — type corrections, cancel and redirect, or queue a message
4. **Do useful work in between** — research, prepare reference files, or work on other tasks the user assigned

## Reading Codex Output

Capture output from the tmux pane. The key challenge is reading **all new output** between checks, not just the last few lines.

### Tracking Position

tmux scrollback is line-indexed from the bottom. To read the delta between checks:

1. On each check, capture a generous window (e.g., `-S -200`) and save the output to a temp file or variable
2. Compare against the previous capture to identify new lines
3. A practical approach: capture to a file and diff against the previous capture

```bash
# Save previous capture
cp /tmp/codex-capture-latest.txt /tmp/codex-capture-prev.txt 2>/dev/null

# Capture current state
tmux capture-pane -t <session-name> -p -S -200 > /tmp/codex-capture-latest.txt

# Show only new lines (diff approach)
diff /tmp/codex-capture-prev.txt /tmp/codex-capture-latest.txt | grep '^>' | sed 's/^> //'
```

Alternatively, use a simpler approach: capture enough lines to overlap with your last check (e.g., `-S -100` every 30 seconds is usually sufficient since Codex doesn't produce more than ~50 lines of visible output in that time). Read the full capture and mentally skip what you've already seen.

### What to Look For

Look for:
- **Thinking blocks** (indented text with "I'm thinking..." / "I need to..." / "I should...") — these reveal Codex's reasoning and intentions
- **Tool calls** (`Ran ...`, `Read ...`, `Wrote ...`) — these show what actions it's taking
- **Status line** at the bottom — shows working time, context remaining, and model info
- **Prompt symbol** (`›`) — means Codex is waiting for input
- **"esc to interrupt"** — means Codex is actively working

## Sending Commands

```bash
# Type a message — DO NOT include Enter in the same send-keys call as the text.
# tmux buffers long strings and often drops the trailing Enter.
tmux send-keys -t <session-name> "Your instruction here"
# Always send Enter as a SEPARATE command:
tmux send-keys -t <session-name> Enter

# Cancel current work (sends Escape)
tmux send-keys -t <session-name> Escape
```

**Codex input modes matter.** Codex has three ways to receive input:
- **Enter**: Submits immediately. If Codex is mid-tool-call, this injects the message into the current turn.
- **Tab**: Queues the message for delivery after the current turn finishes. Use this when Codex is actively working and you want it to see your message next, without interrupting.
- **Escape**: Cancels the current work.

When Codex is actively working (`Working (Ns • esc to interrupt)`), prefer **Tab** to queue your message rather than Enter. This avoids injecting mid-execution and ensures Codex sees your feedback cleanly at its next prompt.

**Always verify delivery.** After sending, wait 2-3 seconds and capture the pane to confirm Codex received the instruction and started processing:

```bash
sleep 3 && tmux capture-pane -t <session-name> -p -S -5
```

Look for the `Working (Ns • esc to interrupt)` status line to confirm it's processing.

## Respecting the Plan

Plans encode hard-won context: architectural decisions, phase ordering, scope boundaries, and the rationale behind all of it. Your job is to keep Codex aligned with the plan, not to impose your own ordering or judgment about what should come next.

- **Follow the plan's phase order linearly.** If the plan says Phase 2 before Phase 5, enforce that even if Codex wants to jump ahead because the later phase seems more interesting or technically ready.
- **Don't reorder work** unless there's a concrete blocker. If Codex skips a step, redirect it back.
- **Don't inject your own priorities.** The plan's author had reasons for the ordering — dependencies, risk management, incremental testability. Trust that.
- **If the plan seems wrong**, raise it with the user rather than unilaterally overriding it.

## Deferring to Codex's Technical Judgment

Codex often has excellent technical intuitions. Your role is supervisory, not directive on implementation details.

- **Defer on technical approach.** If Codex chooses a slightly different API, data structure, or code organization than you'd pick, let it go — as long as the result serves the plan's goals.
- **Don't micromanage code style.** Focus on whether the work is correct and on-plan, not on how you'd write it.
- **Do push back on** decisions that contradict the plan, violate documented architectural choices, or introduce unnecessary complexity. But distinguish between "I'd do it differently" and "this is actually wrong."
- **Run ideas back and forth.** If you're unsure whether something Codex is doing is right, you can research it and share findings rather than immediately correcting.

## When to Intervene

Intervene when you see Codex:

- **Going off-plan**: Working on something not in the current phase, skipping steps, or reordering work without reason
- **Forgetting to read docs**: Making assumptions about code structure, APIs, or specs without reading the relevant files first. If you see it guessing, tell it which files to read.
- **Spinning on a problem**: Trying the same approach repeatedly, or spending too long exploring when you already know the answer. Share what you know.
- **Making architectural mistakes**: Contradicting decisions already made in the plan or introducing unnecessary abstractions
- **Running low on context**: When context drops below ~20-30%, Codex may lose track of earlier decisions. Consider summarizing key state and providing focused instructions for the remaining work.
- **Missing domain knowledge**: When Codex is about to implement something that requires spec knowledge it can't look up (e.g., external protocol specs). Do the research and provide it.

## When NOT to Intervene

- Codex is making steady progress on the right track — let it work
- It's doing reasonable exploratory research before implementing — this is good practice
- It's taking a slightly different technical approach than you'd choose but the result will be equivalent — defer to its judgment
- It's running tests or verifying its work — never interrupt verification
- It's reading code to understand context before making changes — this is what good engineers do

## How to Intervene Effectively

### Light touch (queue a message)
When Codex is actively working but you want it to know something for its next step:
```bash
# Codex will see this when it next pauses
tmux send-keys -t <session-name> "Note: when you get to the UDAP part, read reference-implementation/plans/references/udap-spec-notes.md first" Enter
```

### Redirect (cancel and re-instruct)
When Codex is actively going down the wrong path:
```bash
tmux send-keys -t <session-name> Escape
# Wait for it to stop
sleep 2
tmux send-keys -t <session-name> "Stop. You're working on Phase 5 but Phase 2 spec updates aren't done yet. Go back to updating ticket-input-spec.md, PermissionTicket.fsh, and index.md first." Enter
```

### Provide research
When Codex needs information it doesn't have, do the research yourself and write findings to a file it can read:
```bash
# You write a reference file
# Then tell Codex about it
tmux send-keys -t <session-name> "I've written UDAP spec notes to reference-implementation/plans/references/udap-notes.md — read that before implementing the registration endpoint" Enter
```

## Supporting Codex with Research

One of the most valuable things you can do while babysitting is **proactive background research**. This is where you add the most value — Codex can write code but it can't browse specs or consult external documentation.

### When to Research

- When you see Codex is about to tackle something that requires domain knowledge (protocol specs, API docs, framework conventions)
- When Codex is exploring/guessing at something you could answer definitively
- When the plan references external standards or specs
- When you notice Codex making tentative assumptions that could be resolved with a quick lookup

### How to Research

1. **Read ahead** in the plan to understand what's coming next
2. **Launch background agents** to research in parallel while you monitor (use `run_in_background: true`)
3. **Write reference files** summarizing findings in a location within the project that Codex can read (e.g., `plans/references/`)
4. **Point Codex to the reference** when it reaches that part of the work

### What Makes a Good Reference File

- Focused on what an implementer needs: wire formats, validation rules, required fields, error codes
- Concrete examples over abstract descriptions
- Clear about what's required vs. optional vs. deferred
- Short enough that Codex won't waste context reading it (aim for 100-300 lines)

### What to Research

- External protocol specs that Codex can't browse (UDAP, SMART, FHIR, OAuth, OpenID, etc.)
- Library APIs and runtime capabilities (e.g., "does Bun support X509Certificate?")
- Complex existing code patterns that are easy to misunderstand without context
- Decisions made in earlier conversations that aren't captured in code or plan

## Tracking Progress

Keep a mental model of:
- Which plan phase Codex is working on
- Which checklist items are done vs. in progress
- How much context Codex has left (visible in the status line)
- Whether tests are passing

### Reviewing File Changes

Don't rely solely on tmux output to understand what Codex is doing. Periodically review the actual file changes:

```bash
# See what files changed (run from the relevant repo root)
git diff --stat

# Read specific changed files to verify quality
git diff <file>
```

This gives you a fuller picture than tmux alone — you can catch issues that aren't visible in the scrollback (e.g., Codex silently breaking an unrelated file, or making changes that look correct in isolation but conflict with another part of the codebase).

Note: some projects use nested git repos (e.g., a reference-implementation subdir). Make sure you're running git commands from the right directory.

If Codex completes a phase or significant chunk, consider telling it to run tests before moving on. Clean phase boundaries help catch regressions early.

## Context Management

Codex has finite context but supports **incremental compaction** — it can automatically compress earlier context to free up space, so you may see context jump from 30% back to 50%. This means context percentage isn't a hard cliff.

That said, compaction loses detail. Keep an eye on:
- **Quality of output after compaction**: If Codex starts repeating itself, forgetting decisions, or losing track of what files it changed, it may have compacted too aggressively
- **Very low context (<15%)**: Even with compaction, eventually the session loses coherence. Prepare a handoff.
- **Long sessions with many phases**: Consider whether starting a fresh session with a focused handoff summary would be more effective than letting compaction handle it

## Working on Other Tasks

Between Codex checks, you can do other work the user has assigned. Set yourself a rhythm:
- **Always check every ~30 seconds** — this is non-negotiable. You need to stay aware of what Codex is doing so you can intervene if needed.
- Checking frequently does NOT mean interrupting frequently. Most checks should be read-only: capture, assess, move on.
- Always check immediately after Codex finishes a task and pauses for input — don't leave it idle.
- The goal of frequent checks is awareness, not control. You're watching for moments where Codex genuinely needs help (missing context, going off-plan, hitting a dead end), not looking for things to correct.

## Progress Visualization

If the user wants visibility into Codex's progress, build a live dashboard. The most effective format is a **compact radial/sunburst chart** — not a long scrollable checklist.

### Design Principles

- **High information density.** The user should see the full plan status at a glance without scrolling. A radial chart with one arc segment per phase, filled proportionally by completion, works well.
- **Hover for detail.** Individual checklist items belong in tooltips on hover, not in the main view.
- **Auto-refresh.** The dashboard reads from a JSON file on disk and polls every 5-10 seconds. You update the JSON; the browser picks it up.
- **Compact metadata bar.** Show model, context remaining, current activity, and last-checked time in a single line at the top.
- **Timeline at the bottom.** A short scrollable log of key events (phase completions, test results, interventions) in reverse chronological order.

### Implementation

1. Write a JSON state file (e.g., `/tmp/codex-progress.json`) with phases, items, timeline, and metadata
2. Write a static HTML file alongside it that fetches the JSON via relative path and renders SVG
3. Serve with a minimal Bun server:

```typescript
// /tmp/codex-viz-server.ts
const server = Bun.serve({
  port: 8199,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/codex-dashboard.html" : url.pathname;
    const file = Bun.file(`/tmp${path}`);
    return new Response(file);
  },
});
console.log(`Dashboard: http://localhost:${server.port}`);
```

Run with `bun run /tmp/codex-viz-server.ts &` — this is simpler and more portable than launching Chromium with special flags or using `python3 -m http.server`.

4. Tell the user the URL — let them open it in whatever browser they prefer. Don't launch browsers programmatically; it's fiddly across different machines and window managers.
5. Update the JSON every time you check on Codex — the browser auto-refreshes

### What to Track in the JSON

```json
{
  "session": "codex-babysat",
  "model": "gpt-5.4 xhigh fast",
  "plan": "Plan 08: Trust Frameworks...",
  "contextRemaining": "38%",
  "currentActivity": "Phase 6: UDAP token auth...",
  "phases": [
    {
      "id": "phase-1", "name": "Core Types", "status": "done",
      "items": [{"task": "Framework types in model.ts", "done": true}, ...]
    }
  ],
  "timeline": [
    {"time": "20:00", "event": "Session started"},
    {"time": "20:45", "event": "Phase 5 UDAP registration tests green"}
  ],
  "filesChanged": ["src/app.ts", "src/auth/frameworks/udap.ts"]
}
```

### Keeping It Updated

Update the JSON every time you check on Codex. At minimum, update:
- `contextRemaining` and `currentActivity` on every check
- Phase item `done` flags when you see Codex complete tasks
- Timeline entries at significant milestones (phase completions, test results, interventions, compactions)

Don't let the dashboard go stale — it's only useful if it reflects reality.

### Verifying the Implementation

After Codex finishes (or at major milestones), **run the server and test the new functionality yourself**. Don't rely solely on `bun test` passing — start the actual server, hit the new endpoints with `curl`, open the UI in a browser. This catches issues that tests miss, like:
- Default config not exercising new code paths (e.g., `frameworks: []`)
- New endpoints returning 404 because routes aren't wired at the expected paths
- UI not reflecting new features because bootstrap data doesn't include new fields

If you find issues, report them to Codex with specific details (what you tried, what you expected, what happened).

## When Codex Finishes or Pauses

When Codex completes a turn and waits for input:
- Review what it accomplished by reading the tmux output and checking file diffs
- Decide what to tell it next based on the plan
- Send clear, specific instructions — reference file paths and plan phase numbers
- Don't leave it idle for long if there's more work to do

### Giving Instructions with Confidence

Be directive but not micromanaging. State what to do next, not how to do it.

**Bad**: "If you have time, maybe look at Phase 4 consistency checks"
**Bad**: "Add Cache-Control: no-store and Pragma: no-cache headers to the token response in app.ts" (too specific — Codex can figure out the fix)
**Good**: "Continue into Phase 6 UDAP token auth. After that, do Phase 4 consistency checks."
**Good**: "Inferno test 2.3.03 fails — token response missing required OAuth cache headers. Fix it."

Don't hedge with "if you have time" or "when you get a chance." But also don't dictate implementation details — Codex often has excellent intuitions about how to structure fixes. Give it the *what* and *why*, not the *how*. Share test results, error messages, and spec requirements. Let Codex decide where to put the code and how to structure it.

### Avoid Micromanaging

Your role is to provide context Codex doesn't have (test results, spec requirements, external tool behavior) and keep it on track with the plan. You are NOT a code reviewer giving line-by-line instructions. Signs you're micromanaging:

- Telling Codex which file and function to edit
- Specifying the exact code change
- Giving multi-step implementation instructions when one sentence of context would suffice
- Sending instructions faster than Codex can complete them

If you find yourself writing implementation details, ask: "Would Codex figure this out on its own if I just told it what test is failing and why?" Usually yes.
