import type { ExerciseMeta } from "@/lib/exercises";
import { ArtworkCard } from "./ArtworkCard";

type Props = {
  exercises: ExerciseMeta[];
  label: string;
};

export function Gallery({ exercises, label }: Props) {
  if (exercises.length === 0) {
    return (
      <p className="page-lede" style={{ padding: "0 var(--page-pad)" }}>
        Nothing here yet.
      </p>
    );
  }

  return (
    <section className="gallery" aria-label={label}>
      {exercises.map((exercise) => (
        <ArtworkCard key={exercise.href} exercise={exercise} />
      ))}
    </section>
  );
}
