/**
 * Export slide images into a PPTX file.
 *
 * Usage: bun run export-pptx.ts <slides-dir> <out.pptx>
 */

import PptxGenJS from "pptxgenjs";
import { readdir } from "fs/promises";
import { join, extname } from "path";

async function main() {
  const [slidesDir, outPath] = process.argv.slice(2);

  if (!slidesDir || !outPath) {
    console.error("Usage: bun run export-pptx.ts <slides-dir> <out.pptx>");
    process.exit(1);
  }

  const files = await readdir(slidesDir);
  const slideFiles = files
    .filter((f) => f.match(/^slide-\d+\.(png|jpg|jpeg)$/))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

  if (slideFiles.length === 0) {
    console.error(`No slide images found in ${slidesDir}/`);
    process.exit(1);
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  for (const file of slideFiles) {
    const imageBytes = await Bun.file(join(slidesDir, file)).arrayBuffer();
    const base64 = Buffer.from(imageBytes).toString("base64");
    const ext = extname(file).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

    const slide = pptx.addSlide();
    slide.addImage({ data: `data:${mime};base64,${base64}`, x: 0, y: 0, w: "100%", h: "100%" });
    console.log(`  Added: ${file}`);
  }

  await pptx.writeFile({ fileName: outPath });
  console.log(`PPTX saved: ${outPath} (${slideFiles.length} slides)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
