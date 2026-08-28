import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { ExerciseMeta } from "@/lib/exercises";

type Props = {
  exercise: ExerciseMeta;
};

function formatDate(date: string) {
  return date ? format(parseISO(date), "MMMM d, yyyy") : "";
}

export function ArtworkCard({ exercise }: Props) {
  const caption = exercise.caption || exercise.excerpt;
  const dateLabel = formatDate(exercise.date);

  return (
    <article className={`artwork${exercise.wide ? " artwork--wide" : ""}`}>
      <Link href={exercise.href} className="artwork-link">
        <div
          className="artwork-media"
          style={{ aspectRatio: exercise.aspectRatio ?? "4 / 5" }}
        >
          {exercise.image ? (
            <Image
              src={exercise.image}
              alt={exercise.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="artwork-image"
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
        <div className="artwork-meta">
          <h2 className="artwork-title">{exercise.title}</h2>
          {caption && caption !== exercise.title ? (
            <p className="artwork-caption">{caption}</p>
          ) : null}
          {dateLabel ? <p className="artwork-details">{dateLabel}</p> : null}
        </div>
      </Link>
    </article>
  );
}
