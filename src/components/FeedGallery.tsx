"use client";

import { useMemo, useState } from "react";
import type { ExerciseMeta } from "@/lib/exercises";
import { Gallery } from "./Gallery";

type Filter = "all" | "ink" | "color";

type Props = {
  exercises: ExerciseMeta[];
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ink", label: "Ink" },
  { id: "color", label: "Color" },
];

export function FeedGallery({ exercises }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    if (filter === "color") return exercises.filter((item) => item.color);
    if (filter === "ink") return exercises.filter((item) => !item.color);
    return exercises;
  }, [exercises, filter]);

  const colorCount = exercises.filter((item) => item.color).length;

  return (
    <>
      {colorCount > 0 ? (
        <div className="gallery-filters" role="tablist" aria-label="Filter feed">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`gallery-filter${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <Gallery exercises={visible} label="Feed" />
    </>
  );
}
