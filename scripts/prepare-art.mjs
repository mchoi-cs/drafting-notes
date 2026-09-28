/**
 * Turns the originals in assets/ into web-sized files under public/art/.
 *
 * Re-run after adding to assets/; it skips anything already converted unless
 * you pass --force.
 *
 * Pass --sticker to also write white-on-transparent overlays into stickers/.
 * That fills in stickers for originals whose WebP already exists, so it works
 * as a backfill pass over assets/.
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { processPlate } from "./lib/process-plate.mjs";
import { readable } from "./lib/readable.mjs";
import { makeSticker, stickerDir, stickerFileName } from "./lib/sticker.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets");
const OUT = path.join(ROOT, "public", "art");
const STICKERS = stickerDir(ROOT);

const force = process.argv.includes("--force");
const sticker = process.argv.includes("--sticker");
const stickerBoost =
  Number(process.argv[process.argv.indexOf("--sticker-boost") + 1]) || 1;

if (!existsSync(SOURCE)) {
  console.error("No assets/ folder yet. Drop originals there, then rerun.");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
if (sticker) await mkdir(STICKERS, { recursive: true });

const files = (await readdir(SOURCE))
  .filter((name) => /\.(png|jpe?g|webp|tiff?|heic)$/i.test(name))
  .sort();

for (const name of files) {
  const from = path.join(SOURCE, name);
  const slug = path.parse(name).name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const to = path.join(OUT, `${slug}.webp`);
  const white = sticker ? path.join(STICKERS, stickerFileName(slug)) : "";
  const needsSticker = Boolean(white) && (force || !existsSync(white));

  if (existsSync(to) && !force && !needsSticker) {
    console.log(`skip  ${path.relative(ROOT, to)}`);
    continue;
  }

  const source = await readable(from);

  if (needsSticker) {
    const made = await makeSticker(source, { boost: stickerBoost });
    await writeFile(white, made.buffer);
    console.log(
      `white ${path.relative(ROOT, white)}  ${made.width}x${made.height}`
    );
  }

  if (existsSync(to) && !force) {
    console.log(`skip  ${path.relative(ROOT, to)}`);
    continue;
  }

  const info = await processPlate(source);
  await writeFile(to, info.buffer);

  const before = (await stat(from)).size;
  const ratio = (before / info.buffer.length).toFixed(0);
  console.log(
    `write ${path.relative(ROOT, to)}  ${info.width}x${info.height}  ` +
      `${(info.buffer.length / 1024).toFixed(0)}KB  (${ratio}x smaller)  ` +
      `aspect ${info.width} / ${info.height}`
  );
}
