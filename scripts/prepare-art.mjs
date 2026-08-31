/**
 * Turns the originals in assets/ into web-sized files under public/art/.
 *
 * Re-run after adding to assets/; it skips anything already converted unless
 * you pass --force.
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { processPlate } from "./lib/process-plate.mjs";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "assets");
const OUT = path.join(ROOT, "public", "art");

const force = process.argv.includes("--force");

if (!existsSync(SOURCE)) {
  console.error("No assets/ folder yet. Drop originals there, then rerun.");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

/** sharp has no HEIC decoder, so lean on the converter macOS already ships. */
async function readable(file) {
  if (!/\.heic$/i.test(file)) return file;
  const staged = path.join(os.tmpdir(), `${path.parse(file).name}.png`);
  await run("sips", ["-s", "format", "png", file, "--out", staged]);
  return staged;
}

const files = (await readdir(SOURCE))
  .filter((name) => /\.(png|jpe?g|webp|tiff?|heic)$/i.test(name))
  .sort();

for (const name of files) {
  const from = path.join(SOURCE, name);
  const slug = path.parse(name).name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const to = path.join(OUT, `${slug}.webp`);

  if (existsSync(to) && !force) {
    console.log(`skip  ${path.relative(ROOT, to)}`);
    continue;
  }

  const info = await processPlate(await readable(from));
  await writeFile(to, info.buffer);

  const before = (await stat(from)).size;
  const ratio = (before / info.buffer.length).toFixed(0);
  console.log(
    `write ${path.relative(ROOT, to)}  ${info.width}x${info.height}  ` +
      `${(info.buffer.length / 1024).toFixed(0)}KB  (${ratio}x smaller)  ` +
      `aspect ${info.width} / ${info.height}`
  );
}
