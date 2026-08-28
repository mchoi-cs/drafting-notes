import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Exercise } from "@/lib/exercises";
import { CATEGORIES, type CategorySlug } from "@/lib/site";

type Props = {
  exercise: Exercise;
  category: CategorySlug;
};

export function PlateArticle({ exercise, category }: Props) {
  const hasBody = Boolean(exercise.contentHtml.replace(/<[^>]*>/g, "").trim());
  const backHref = CATEGORIES[category].href;
  const backLabel = CATEGORIES[category].label;

  return (
    <article className="page-narrow">
      <Link href={backHref} className="post-back">
        ← {backLabel}
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
