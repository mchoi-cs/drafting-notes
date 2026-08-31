/**
 * Ingest one photo as a grayscale plate.
 *
 *     npm run plate -- ./photo.jpg --caption "Two-point boxes"
 *     npm run plate -- ./photo.jpg --caption "Two-point boxes" --section form-construction
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { processPlate } from "./lib/process-plate.mjs";

const run = promisify(execFile);
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

async function readable(file) {
  if (!/\.heic$/i.test(file)) return file;
  const staged = path.join(os.tmpdir(), `${path.parse(file).name}.png`);
  await run("sips", ["-s", "format", "png", file, "--out", staged]);
  return staged;
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

if (!fileArg || !caption || !category) {
  console.error(
    'Usage:\n  npm run plate -- ./photo.jpg --caption "Two-point boxes" [--section feed] [--title "Boxes"] [--date 2026-08-28]'
  );
  process.exit(1);
}

const from = path.resolve(fileArg);
if (!existsSync(from)) {
  console.error(`No file at ${from}`);
  process.exit(1);
}

const slug = uniqueSlug(
  path.join(ROOT, "content", category),
  slugify(title)
);

const artDir = path.join(ROOT, "public", "art");
const contentDir = path.join(ROOT, "content", category);
await mkdir(artDir, { recursive: true });
await mkdir(contentDir, { recursive: true });

const info = await processPlate(await readable(from));
await writeFile(path.join(artDir, `${slug}.webp`), info.buffer);

const wide = info.width / info.height >= 1.3;
const imagePath = `/art/${slug}.webp`;
const extras =
  category === "drafting-meta"
    ? `excerpt: "${yaml(caption)}"
image: "${imagePath}"
`
    : `caption: "${yaml(caption)}"
excerpt: "${yaml(caption)}"
image: "${imagePath}"
aspectRatio: "${info.width} / ${info.height}"
wide: ${wide}
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
