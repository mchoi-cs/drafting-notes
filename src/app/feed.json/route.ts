import { getExercisesByCategory } from "@/lib/exercises";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

/** Absolute so another site can use the value without knowing this origin. */
function absolute(pathname: string) {
  return new URL(pathname, siteConfig.url).toString();
}

export function GET() {
  const plates = getExercisesByCategory("feed").map((plate) => ({
    slug: plate.slug,
    title: plate.title,
    caption: plate.caption ?? null,
    date: plate.date,
    image: plate.image ? absolute(plate.image) : null,
    aspectRatio: plate.aspectRatio ?? null,
    wide: Boolean(plate.wide),
    color: Boolean(plate.color),
    href: absolute(plate.href),
  }));

  return Response.json(plates, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
