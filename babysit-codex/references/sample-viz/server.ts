// Sample dashboard server for the babysit-codex skill.
//
// Serves the dashboard HTML from this directory and reads the live
// progress JSON from a configurable path so the skill directory itself
// stays free of run-specific state.
//
// Usage:
//   bun run server.ts                            # defaults to /tmp/codex-progress.json
//   bun run server.ts /path/to/progress.json     # custom path
//   PROGRESS_PATH=/path bun run server.ts        # via env var
//   PORT=8200 bun run server.ts                  # custom port

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const PROGRESS_PATH = resolve(
  process.argv[2] ?? Bun.env.PROGRESS_PATH ?? "/tmp/codex-progress.json"
);
const PORT = Number(Bun.env.PORT ?? 8199);

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

    // Serve live progress JSON from the configured path
    if (pathname === "/codex-progress.json" || pathname === "/progress.json") {
      return new Response(Bun.file(PROGRESS_PATH), { headers: noCache });
    }

    // Everything else is served from this directory
    return new Response(Bun.file(join(HERE, pathname)), { headers: noCache });
  },
});

console.log(`Dashboard:        http://localhost:${server.port}`);
console.log(`Progress JSON:    ${PROGRESS_PATH}`);
console.log(`HTML directory:   ${HERE}`);
