import { Gallery } from "@/components/Gallery";
import { getAllExercises } from "@/lib/exercises";

export default function HomePage() {
  const plates = getAllExercises().filter(
    (exercise) =>
      exercise.image || exercise.category === "form-construction"
  );

  return <Gallery exercises={plates} label="Feed" />;
}
