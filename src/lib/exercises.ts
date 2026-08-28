import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import readingTime from "reading-time";
import {
  CATEGORIES,
  type CategorySlug,
} from "@/lib/site";

const contentRoot = path.join(process.cwd(), "content");

export type ExerciseMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: CategorySlug;
  href: string;
  caption?: string;
  image?: string;
  aspectRatio?: string;
  wide?: boolean;
  medium?: string;
  placeholderColor?: string;
  readingTime: string;
};

export type Exercise = ExerciseMeta & {
  contentHtml: string;
};

function categoryDir(category: CategorySlug) {
  return path.join(contentRoot, category);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function slugsIn(category: CategorySlug): string[] {
  const dir = categoryDir(category);
  ensureDir(dir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

function readFile(category: CategorySlug, slug: string) {
  const fullPath = path.join(categoryDir(category), `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  return matter(fileContents);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toMeta(
  category: CategorySlug,
  slug: string,
  data: { [key: string]: unknown },
  content: string
): ExerciseMeta {
  const stats = readingTime(content);
  return {
    slug,
    title: asString(data.title, slug),
    date: asString(data.date),
    caption: asString(data.caption) || asString(data.excerpt) || undefined,
    excerpt: asString(data.excerpt) || asString(data.caption),
    category,
    href: `${CATEGORIES[category].href}/${slug}`,
    image: asString(data.image) || undefined,
    aspectRatio: asString(data.aspectRatio) || undefined,
    wide: Boolean(data.wide),
    medium: asString(data.medium) || undefined,
    placeholderColor: asString(data.placeholderColor) || undefined,
    readingTime: stats.text,
  };
}

export function getExercise(category: CategorySlug, slug: string): Exercise {
  const { data, content } = readFile(category, slug);
  const processed = remark().use(html).processSync(content);

  return {
    ...toMeta(category, slug, data as { [key: string]: unknown }, content),
    contentHtml: processed.toString(),
  };
}

export function getExercisesByCategory(category: CategorySlug): ExerciseMeta[] {
  return slugsIn(category)
    .map((slug) => {
      const { data, content } = readFile(category, slug);
      return toMeta(
        category,
        slug,
        data as { [key: string]: unknown },
        content
      );
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllExercises(): ExerciseMeta[] {
  return (Object.keys(CATEGORIES) as CategorySlug[])
    .flatMap((category) => getExercisesByCategory(category))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
