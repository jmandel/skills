/**
 * Generate slide images using one-shot prompting with a selected exemplar.
 *
 * Usage: bun run generate.ts <prompts-dir> <slides-out-dir> [exemplar-path] [slide-numbers...]
 *
 * Reads:  <prompts-dir>/brief.md, <prompts-dir>/slide-N.md
 * Writes: <slides-out-dir>/slide-N.{png,jpg}
 *
 * If exemplar-path is provided, it's used as a one-shot style reference.
 * If no slide numbers given, auto-discovers all slide-N.md in prompts-dir.
 */

import { generateImage, imageToDataUri } from "./api";
import { mkdir, readdir } from "fs/promises";
import { join } from "path";

async function main() {
  const args = process.argv.slice(2);
  const promptsDir = args[0];
  const slidesOutDir = args[1];
  const exemplarPath = args[2] && !args[2].match(/^\d+$/) ? args[2] : undefined;
  const explicitSlides = args.slice(exemplarPath ? 3 : 2).map(Number).filter((n) => !isNaN(n));

  if (!promptsDir || !slidesOutDir) {
    console.error("Usage: bun run generate.ts <prompts-dir> <slides-out-dir> [exemplar-path] [slide-numbers...]");
    process.exit(1);
  }

  const brief = await Bun.file(join(promptsDir, "brief.md")).text();

  let slideNums: number[];
  if (explicitSlides.length > 0) {
    slideNums = explicitSlides;
  } else {
    const files = await readdir(promptsDir);
    slideNums = files
      .filter((f) => f.match(/^slide-\d+\.md$/))
      .map((f) => parseInt(f.match(/\d+/)![0]))
      .sort((a, b) => a - b);
  }

  if (slideNums.length === 0) {
    console.error(`No slide prompts found in ${promptsDir}/`);
    process.exit(1);
  }

  let exemplarDataUri: string | undefined;
  if (exemplarPath) {
    exemplarDataUri = await imageToDataUri(exemplarPath);
    console.log(`Using exemplar: ${exemplarPath}`);
  } else {
    console.log("No exemplar — generating without one-shot reference.");
  }

  await mkdir(slidesOutDir, { recursive: true });

  for (const num of slideNums) {
    const slidePrompt = await Bun.file(join(promptsDir, `slide-${num}.md`)).text().catch(() => null);
    if (!slidePrompt) { console.error(`  Skipping slide ${num}: not found`); continue; }

    console.log(`Slide ${num}:`);
    const fullPrompt = [brief, "\n---\n", "Generate the following as a single 16:9 presentation slide image:", "", slidePrompt].join("\n");

    try {
      const result = await generateImage({ prompt: fullPrompt, referenceImage: exemplarDataUri });
      const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
      const outPath = join(slidesOutDir, `slide-${num}.${ext}`);
      await Bun.write(outPath, result.image);
      console.log(`  Saved: ${outPath} (${(result.image.length / 1024).toFixed(0)} KB)`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
