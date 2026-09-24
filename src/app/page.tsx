import { FeedGallery } from "@/components/FeedGallery";
import { getExercisesByCategory } from "@/lib/exercises";

export default function HomePage() {
  const plates = getExercisesByCategory("feed");
  return <FeedGallery exercises={plates} />;
}
