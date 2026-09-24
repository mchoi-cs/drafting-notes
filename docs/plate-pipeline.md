# Plate pipeline

Phone photos of ink-on-paper sketches usually look grey and uneven: the page is mid-tone, corners fall into shadow, and EXIF orientation is often wrong. This repo fixes that at ingest time so every plate on the site has a bright page and dark ink, without a separate AI model.

## How to run it

```bash
# Feed (default) — greyscale ink plates
npm run plate -- ./photo.jpg --caption "Face study"

# Occasional color wash / watercolor
npm run plate -- ./photo.jpg --caption "Cassowary" --color

# Form Construction — intentional perspective plates
npm run plate -- ./photo.jpg --caption "Two-point boxes" --section form-construction
```

Optional flags: `--title`, `--date` (`YYYY-MM-DD`), `--slug` (overwrite an existing plate), `--color`.

Default processing is **greyscale** (most plates). Pass `--color` to keep hue; that also sets `color: true` in the Markdown so the Feed can filter **All / Ink / Color**.

Batch convert originals in `assets/` (no Markdown):

```bash
npm run art          # skip files that already exist in public/art/
npm run art -- --force
```

## What it does

Both `npm run plate` and `npm run art` call the same processor: [`scripts/lib/process-plate.mjs`](../scripts/lib/process-plate.mjs).

```
photo (jpg / png / heic…)
        │
        ▼
  EXIF rotate → white-balance paper → (greyscale unless --color) → resize
        │
        ▼
  Flatten uneven lighting
  (local-max paper field ÷ divide-out)
        │
        ▼
  Percentile normalize (paper → white, ink → black)
  ink plates get an extra paper lift so grey doesn't read as cream
        │
        ▼
  WebP (q≈82) → public/art/<slug>.webp
        │
        ▼
  (plate only) Markdown → content/<section>/<slug>.md
                 including color: true|false
```

### 1. Orient, white-balance, optional greyscale, resize

`sharp` applies EXIF orientation. Phone photos of cream paper get a quick **white-balance** (scale channels so the bright paper percentile is neutral) before greyscale, so yellow grading does not stick around. Color plates keep hue after the same neutral paper step.

HEIC from iPhones is converted with macOS `sips` first (sharp does not decode HEIC).

### 2. Flatten uneven lighting

Phone shots of a page almost always have a vignette or a soft shadow from the hand/phone. A **global** brightness boost cannot fix that: lifting the dark corner blows out the bright center.

Instead the pipeline estimates the *paper* as a slowly varying field:

1. Split the image into coarse blocks (~1/40 of the short edge).
2. In each block, take the **local maximum** (brightest channel when color) — ink/wash is darker than paper, so that response tracks illumination.
3. Upsample that field with **bilinear** interpolation from block centers.
4. Divide by this field and rescale toward a paper reference (~254 for ink, ~245 for color).

### 3. Stretch levels

A percentile normalize maps darkest ink → near black and paper → near white. Ink plates use a **manual** levels stretch (sharp’s built-in `normalize` on 1-channel buffers introduces banding) plus a soft lift on the brightest paper so remaining grey doesn’t read as cream against the site.

### 4. Encode + write content

Output is WebP under `public/art/`. `npm run plate` also writes frontmatter (title, date, caption, image, aspect ratio, `color`) into `content/`.

The Feed UI reads `color` and offers **All / Ink / Color** filters when at least one color plate exists.

## Why not an AI model?

For whitening grey paper and evening phone lighting while keeping ink and light pencil, classical illumination correction is enough: deterministic, fast, no API key, and it does not invent strokes. A learned cleanup model could help later for stains or desk clutter as an optional step.

## Where plates belong

| Section | Command flag | Use for |
|---------|--------------|---------|
| Feed | default / `--section feed` | Casual phone dumps, figure studies |
| Form Construction | `--section form-construction` | Boxes, cylinders, intentional perspective plates |
| Drafting Meta | `npm run post` | Writing only |

## Code map

| File | Role |
|------|------|
| [`scripts/lib/process-plate.mjs`](../scripts/lib/process-plate.mjs) | Shared flatten + normalize + WebP |
| [`scripts/ingest-plate.mjs`](../scripts/ingest-plate.mjs) | `npm run plate` — process + Markdown |
| [`scripts/prepare-art.mjs`](../scripts/prepare-art.mjs) | `npm run art` — batch `assets/` → `public/art/` |
| [`scripts/new-post.mjs`](../scripts/new-post.mjs) | `npm run post` — writing-only note |
| [`src/components/FeedGallery.tsx`](../src/components/FeedGallery.tsx) | Feed All / Ink / Color filter |
