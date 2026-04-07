#!/bin/bash
# Wait for Codex to finish working or timeout, then return new content.
#
# Usage: wait-codex.sh [session_name] [timeout_secs] [poll_interval_secs]
#
# Captures tmux pane content at start, then polls every INTERVAL seconds.
# Returns as soon as Codex goes idle (prompt visible, not working) or TIMEOUT.
# Prints all NEW content since the script started (delta from initial capture).
#
# Exit codes: 0 = Codex went idle, 1 = timeout (still working)

SESSION="${1:-codex-babysat}"
TIMEOUT="${2:-30}"
INTERVAL="${3:-3}"

INITIAL=$(mktemp)
CURRENT=$(mktemp)
trap "rm -f $INITIAL $CURRENT" EXIT

# Capture initial state
tmux capture-pane -t "$SESSION" -p -S -500 > "$INITIAL" 2>/dev/null

ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))

  tmux capture-pane -t "$SESSION" -p -S -500 > "$CURRENT" 2>/dev/null

  # Check if idle: prompt visible, not working
  if tail -5 "$CURRENT" | grep -q '^›'; then
    if ! tail -5 "$CURRENT" | grep -q 'esc to interrupt'; then
      # Idle — return new content
      diff "$INITIAL" "$CURRENT" | grep '^>' | sed 's/^> //'
      exit 0
    fi
  fi
done

# Timeout — return new content anyway
diff "$INITIAL" "$CURRENT" | grep '^>' | sed 's/^> //'
exit 1
