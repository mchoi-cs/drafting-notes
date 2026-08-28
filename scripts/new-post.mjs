/**
 * Starts a new exercise.
 *
 *     npm run post -- "Boxes in space" form-construction
 *     npm run post -- "Why boxes first" drafting-meta
 *
 * Writes a Markdown file with today's date already in the front matter.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CATEGORIES = {
  "form-construction": "form-construction",
  practice: "form-construction",
  "drafting-meta": "drafting-meta",
  meta: "drafting-meta",
};

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const categoryArg = args.at(-1);
const category = CATEGORIES[categoryArg];
const title = (category ? args.slice(0, -1) : args).join(" ").trim();

if (!title || !category) {
  console.error(
    'Give it a title and a category:\n  npm run post -- "Boxes in space" form-construction\n  npm run post -- "Why boxes first" drafting-meta'
  );
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const dir = path.join(ROOT, "content", category);
const file = path.join(dir, `${slug}.md`);

if (existsSync(file)) {
  console.error(`Already exists: ${path.relative(ROOT, file)}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const safeTitle = title.replace(/"/g, '\\"');

const extras =
  category === "form-construction"
    ? `excerpt: ""
caption: ""
image: ""
aspectRatio: "4 / 5"
`
    : `excerpt: ""
`;

await mkdir(dir, { recursive: true });
await writeFile(
  file,
  `---
title: "${safeTitle}"
date: "${today}"
${extras}---

`,
  "utf8"
);

console.log(`${path.relative(ROOT, file)}`);
console.log(`http://localhost:3000/${category}/${slug}`);
