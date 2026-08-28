import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  getExercise,
  getExercisesByCategory,
} from "@/lib/exercises";
import { CATEGORIES } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

const category = "drafting-meta" as const;

export function generateStaticParams() {
  return getExercisesByCategory(category).map((exercise) => ({
    slug: exercise.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = getExercise(category, slug);
    return {
      title: post.title,
      description: post.excerpt,
    };
  } catch {
    return { title: "Note" };
  }
}

export default async function DraftingMetaPostPage({ params }: Props) {
  const { slug } = await params;
  const slugs = getExercisesByCategory(category).map((item) => item.slug);
  if (!slugs.includes(slug)) notFound();

  const post = getExercise(category, slug);

  return (
    <article className="page-narrow">
      <Link href={CATEGORIES[category].href} className="post-back">
        ← {CATEGORIES[category].label}
      </Link>
      <header className="post-header">
        <h1 className="post-title">{post.title}</h1>
        <p className="post-meta">
          {CATEGORIES[category].label}
          {post.date
            ? ` · ${format(parseISO(post.date), "MMMM d, yyyy")}`
            : " · Draft"}
          {post.readingTime ? ` · ${post.readingTime}` : ""}
        </p>
      </header>
      <div
        className="post-body"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
