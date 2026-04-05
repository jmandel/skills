/**
 * Bootstrap: Generate 3 variants of a slide for initial style selection.
 *
 * Usage: bun run bootstrap.ts <slide-number> <prompts-dir> <out-dir>
 *
 * Reads:  <prompts-dir>/brief.md, <prompts-dir>/slide-N.md
 * Writes: <out-dir>/variant-{1,2,3}.{png,jpg}
 */

import { generateImage } from "./api";
import { mkdir } from "fs/promises";
import { join } from "path";

const VARIANTS = 3;

async function main() {
  const [slideArg, promptsDir, outDir] = process.argv.slice(2);
  const slideNum = parseInt(slideArg || "");

  if (isNaN(slideNum) || !promptsDir || !outDir) {
    console.error("Usage: bun run bootstrap.ts <slide-number> <prompts-dir> <out-dir>");
    process.exit(1);
  }

  const brief = await Bun.file(join(promptsDir, "brief.md")).text();
  const slidePrompt = await Bun.file(join(promptsDir, `slide-${slideNum}.md`)).text();

  const fullPrompt = [
    brief,
    "\n---\n",
    "Generate the following as a single 16:9 presentation slide image:",
    "",
    slidePrompt,
  ].join("\n");

  await mkdir(outDir, { recursive: true });

  console.log(`Bootstrapping slide ${slideNum} → ${outDir}/`);

  for (let i = 1; i <= VARIANTS; i++) {
    console.log(`Variant ${i}/${VARIANTS}:`);
    try {
      const result = await generateImage({ prompt: fullPrompt });
      const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
      const outPath = join(outDir, `variant-${i}.${ext}`);
      await Bun.write(outPath, result.image);
      console.log(`  Saved: ${outPath} (${(result.image.length / 1024).toFixed(0)} KB)`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
