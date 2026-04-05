/**
 * Select the best bootstrap variant as the exemplar.
 *
 * Usage: bun run select.ts <variant-path> <exemplar-out-path>
 */

import { copyFile, mkdir } from "fs/promises";
import { dirname } from "path";

async function main() {
  const [variantPath, outPath] = process.argv.slice(2);

  if (!variantPath || !outPath) {
    console.error("Usage: bun run select.ts <variant-path> <exemplar-out-path>");
    process.exit(1);
  }

  await mkdir(dirname(outPath), { recursive: true });
  await copyFile(variantPath, outPath);
  console.log(`Selected: ${variantPath} → ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
