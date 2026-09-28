/**
 * Write one white-line sticker without touching the site.
 *
 *     npm run sticker -- ./photo.jpg
 *     npm run sticker -- public/art/shells-and-starfish.webp
 *     npm run sticker -- ./photo.jpg --slug bull-chimera-2 --boost 1.4
 *
 * `npm run plate -- … --sticker` is the normal path. Use this one to backfill
 * a plate that is already on the site, or to retry with a different boost.
 * Feed it the original photo when you still have it; the 1800px WebP in
 * public/art/ is the fallback for older plates.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readable } from "./lib/readable.mjs";
import { makeSticker, stickerDir, stickerFileName } from "./lib/sticker.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return "";
  return process.argv[index + 1] ?? "";
}

const fileArg = process.argv.slice(2).find((value) => !value.startsWith("--"));
if (!fileArg) {
  console.error(
    "Usage:\n  npm run sticker -- ./photo.jpg [--slug my-plate] [--boost 1.4]"
  );
  process.exit(1);
}

const from = path.resolve(fileArg);
if (!existsSync(from)) {
  console.error(`No file at ${from}`);
  process.exit(1);
}

const slug = (arg("slug") || path.parse(from).name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const boost = Number(arg("boost")) || 1;

const outDir = stickerDir(ROOT);
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, stickerFileName(slug));

const white = await makeSticker(await readable(from), { boost });
await writeFile(outFile, white.buffer);

console.log(
  `${path.relative(ROOT, outFile)}  ${white.width}x${white.height}  ` +
    `from ${white.sourceWidth}x${white.sourceHeight}  ` +
    `${(white.buffer.length / 1024).toFixed(0)}KB  ` +
    `${white.specksRemoved} specks removed`
);
