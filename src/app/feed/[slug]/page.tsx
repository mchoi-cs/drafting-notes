import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlateArticle } from "@/components/PlateArticle";
import {
  getExercise,
  getExercisesByCategory,
} from "@/lib/exercises";

type Props = {
  params: Promise<{ slug: string }>;
};

const category = "feed" as const;

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
    return { title: "Plate" };
  }
}

export default async function FeedPlatePage({ params }: Props) {
  const { slug } = await params;
  const slugs = getExercisesByCategory(category).map((item) => item.slug);
  if (!slugs.includes(slug)) notFound();

  return (
    <PlateArticle
      category={category}
      exercise={getExercise(category, slug)}
    />
  );
}
