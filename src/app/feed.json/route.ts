import { getExercisesByCategory } from "@/lib/exercises";
import { siteConfig } from "@/lib/site";

/**
 * The feed, as JSON, for anywhere else that wants to show recent plates.
 * michellechoi-art.vercel.app reads this to preview the newest drawings.
 *
 * It is written at build time from the same Markdown the Feed page renders, so
 * a plate added with `npm run plate` is in here the moment this deploys and
 * there is no index to maintain. Nothing outside `content/feed` is described:
 * stickers are not part of the site and are not part of this.
 *
 * `image` and `href` are paths, not URLs, so they resolve against whichever
 * host served the file. Plates are newest first, so a consumer wanting a
 * handful can take them off the front.
 */
export const dynamic = "force-static";

export function GET() {
  const plates = getExercisesByCategory("feed").map((plate) => ({
    slug: plate.slug,
    title: plate.title,
    caption: plate.caption ?? null,
    date: plate.date,
    image: plate.image ?? null,
    aspectRatio: plate.aspectRatio ?? null,
    wide: Boolean(plate.wide),
    color: Boolean(plate.color),
    href: plate.href,
  }));

  return Response.json({
    site: siteConfig.name,
    generated: new Date().toISOString(),
    plates,
  });
}
