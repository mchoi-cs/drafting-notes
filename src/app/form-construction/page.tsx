import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { getExercisesByCategory } from "@/lib/exercises";
import { CATEGORIES } from "@/lib/site";

const category = CATEGORIES["form-construction"];

export const metadata: Metadata = {
  title: category.label,
};

export default function FormConstructionPage() {
  const exercises = getExercisesByCategory("form-construction");

  return (
    <>
      <div className="page-narrow page-narrow--flush">
        <h1 className="page-title">{category.label}</h1>
        <p className="page-lede">{category.lede}</p>
      </div>
      <Gallery exercises={exercises} label={category.label} />
    </>
  );
}
