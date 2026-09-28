/**
 * Ingest one photo as a plate.
 *
 *     npm run plate -- ./photo.jpg --caption "Two-point boxes"
 *     npm run plate -- ./photo.jpg --caption "Cassowary" --color
 *     npm run plate -- ./photo.jpg --caption "Profile" --section form-construction
 *     npm run plate -- ./photo.jpg --caption "Shells" --sticker
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { processPlate } from "./lib/process-plate.mjs";
import { readable } from "./lib/readable.mjs";
import { makeSticker, stickerDir, stickerFileName } from "./lib/sticker.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const CATEGORIES = {
  feed: "feed",
  "form-construction": "form-construction",
  practice: "form-construction",
  "drafting-meta": "drafting-meta",
  meta: "drafting-meta",
};

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return "";
  return process.argv[index + 1] ?? "";
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `plate-${Date.now()}`
  );
}

function yaml(value) {
  return value.replace(/"/g, '\\"');
}

function uniqueSlug(dir, base) {
  if (!existsSync(path.join(dir, `${base}.md`))) return base;
  let n = 2;
  while (existsSync(path.join(dir, `${base}-${n}.md`))) n += 1;
  return `${base}-${n}`;
}

const fileArg = process.argv.slice(2).find((value) => !value.startsWith("--"));
const caption = arg("caption");
const title = arg("title") || caption;
const sectionArg = arg("section") || "feed";
const category = CATEGORIES[sectionArg];
const date = arg("date") || new Date().toISOString().slice(0, 10);
const color = hasFlag("color");
const forceSlug = arg("slug");
const sticker = hasFlag("sticker");
const stickerBoost = Number(arg("sticker-boost")) || 1;

if (!fileArg || !caption || !category) {
  console.error(
    'Usage:\n  npm run plate -- ./photo.jpg --caption "Two-point boxes" [--color] [--section feed] [--title "Boxes"] [--date 2026-08-28] [--slug existing-slug] [--sticker [--sticker-boost 1.4]]'
  );
  process.exit(1);
}

const from = path.resolve(fileArg);
if (!existsSync(from)) {
  console.error(`No file at ${from}`);
  process.exit(1);
}

const contentDir = path.join(ROOT, "content", category);
const artDir = path.join(ROOT, "public", "art");
await mkdir(artDir, { recursive: true });
await mkdir(contentDir, { recursive: true });

const slug = forceSlug
  ? slugify(forceSlug)
  : uniqueSlug(contentDir, slugify(title));

const source = await readable(from);
const info = await processPlate(source, { color });
await writeFile(path.join(artDir, `${slug}.webp`), info.buffer);

let stickerNote = "";
if (sticker) {
  const outDir = stickerDir(ROOT);
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, stickerFileName(slug));
  const white = await makeSticker(source, { boost: stickerBoost });
  await writeFile(outFile, white.buffer);
  stickerNote = `${path.relative(ROOT, outFile)}  ${white.width}x${white.height}  (commit it — that is how it reaches her Mac)`;
}

const wide = info.width / info.height >= 1.3;
const imagePath = `/art/${slug}.webp`;
const extras =
  category === "drafting-meta"
    ? `excerpt: "${yaml(caption)}"
image: "${imagePath}"
color: ${color}
`
    : `caption: "${yaml(caption)}"
excerpt: "${yaml(caption)}"
image: "${imagePath}"
aspectRatio: "${info.width} / ${info.height}"
wide: ${wide}
color: ${color}
`;

await writeFile(
  path.join(contentDir, `${slug}.md`),
  `---
title: "${yaml(title)}"
date: "${date}"
${extras}---

`,
  "utf8"
);

const href =
  category === "feed" ? `/feed/${slug}` : `/${category}/${slug}`;
console.log(path.relative(ROOT, path.join(contentDir, `${slug}.md`)));
console.log(`http://localhost:3000${href}`);
console.log(color ? "color" : "ink (greyscale)");
if (stickerNote) console.log(stickerNote);
