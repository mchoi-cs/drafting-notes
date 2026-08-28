import { Gallery } from "@/components/Gallery";
import { getExercisesByCategory } from "@/lib/exercises";

export default function HomePage() {
  const plates = getExercisesByCategory("feed");
  return <Gallery exercises={plates} label="Feed" />;
}
