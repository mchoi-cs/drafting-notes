export const CATEGORIES = {
  feed: {
    slug: "feed",
    label: "Feed",
    href: "/",
    lede: "Whatever just got uploaded — casual plates, newest first.",
  },
  "form-construction": {
    slug: "form-construction",
    label: "Form Construction",
    href: "/form-construction",
    lede: "Plates from construction practice — boxes, cylinders, and other solids in perspective.",
  },
  "drafting-meta": {
    slug: "drafting-meta",
    label: "Drafting Meta",
    href: "/drafting-meta",
    lede: "Notes on how the practice is going, and the thinking around the drawings.",
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const siteConfig = {
  name: "charminglines",
  description:
    "Exercises in constructing 3D form in perspective — plates and notes.",
  nav: [
    { label: "Feed", href: "/" },
    { label: "Form Construction", href: "/form-construction" },
    { label: "Drafting Meta", href: "/drafting-meta" },
  ],
};

export function isCategorySlug(value: string): value is CategorySlug {
  return value in CATEGORIES;
}
