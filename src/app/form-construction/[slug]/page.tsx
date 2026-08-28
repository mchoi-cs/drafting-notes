import type { Metadata } from "next";
import Image from "next/image";
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

const category = "form-construction" as const;

export function generateStaticParams() {
  return getExercisesByCategory(category).map((exercise) => ({
    slug: exercise.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const exercise = getExercise(category, slug);
    return {
      title: exercise.title,
      description: exercise.excerpt,
    };
  } catch {
    return { title: "Exercise" };
  }
}

export default async function FormConstructionExercisePage({ params }: Props) {
  const { slug } = await params;
  const slugs = getExercisesByCategory(category).map((item) => item.slug);
  if (!slugs.includes(slug)) notFound();

  const exercise = getExercise(category, slug);
  const hasBody = Boolean(exercise.contentHtml.replace(/<[^>]*>/g, "").trim());

  return (
    <article className="page-narrow">
      <Link href={CATEGORIES[category].href} className="post-back">
        ← {CATEGORIES[category].label}
      </Link>
      <div
        className="exercise-hero"
        style={{ aspectRatio: exercise.aspectRatio ?? "4 / 5" }}
      >
        {exercise.image ? (
          <Image
            src={exercise.image}
            alt={exercise.title}
            fill
            sizes="(max-width: 760px) 100vw, 42rem"
            className="exercise-hero-image"
            priority
          />
        ) : (
          <div
            className="artwork-placeholder"
            style={{
              backgroundColor: exercise.placeholderColor ?? "#d4d4d4",
            }}
            role="img"
            aria-label={`${exercise.title} placeholder`}
          />
        )}
      </div>
      <header className="post-header">
        <h1 className="post-title">{exercise.title}</h1>
        <p className="post-meta">
          {CATEGORIES[category].label}
          {exercise.date
            ? ` · ${format(parseISO(exercise.date), "MMMM d, yyyy")}`
            : ""}
        </p>
        {exercise.caption && exercise.caption !== exercise.title ? (
          <p className="artwork-caption">{exercise.caption}</p>
        ) : null}
      </header>
      {hasBody ? (
        <div
          className="post-body"
          dangerouslySetInnerHTML={{ __html: exercise.contentHtml }}
        />
      ) : null}
    </article>
  );
}
