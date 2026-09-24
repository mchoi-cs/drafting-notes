# Plate pipeline

Phone photos of ink-on-paper sketches usually look grey and uneven: the page is mid-tone, corners fall into shadow, and EXIF orientation is often wrong. This repo fixes that at ingest time so every plate on the site has a bright page and dark ink, without a separate AI model.

## How to run it

```bash
# Feed (default) — casual uploads
npm run plate -- ./photo.jpg --caption "Face study"

# Form Construction — intentional perspective plates
npm run plate -- ./photo.jpg --caption "Two-point boxes" --section form-construction
```

Optional flags: `--title`, `--date` (`YYYY-MM-DD`).

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
  EXIF rotate → greyscale → resize (max edge 1800)
        │
        ▼
  Flatten uneven lighting
  (local-max paper field ÷ divide-out)
        │
        ▼
  Percentile normalize (paper → white, ink → black)
        │
        ▼
  WebP (q≈82) → public/art/<slug>.webp
        │
        ▼
  (plate only) Markdown → content/<section>/<slug>.md
```

### 1. Orient and resize

`sharp` applies EXIF orientation and fits the long edge into 1800px. Color is kept (ink washes, watercolor) — illumination is corrected on RGB, not forced to greyscale.

HEIC from iPhones is converted with macOS `sips` first (sharp does not decode HEIC).

### 2. Flatten uneven lighting

Phone shots of a page almost always have a vignette or a soft shadow from the hand/phone. A **global** brightness boost cannot fix that: lifting the dark corner blows out the bright center.

Instead the pipeline estimates the *paper* as a slowly varying field:

1. Split the image into coarse blocks (~1/40 of the short edge).
2. In each block, take the **local maximum** of the brightest channel — ink/wash is darker than paper, so that response tracks illumination.
3. Upsample that field with **bilinear** interpolation from block centers (smooth block edges without bleeding bright center values into dark corners the way a large Gaussian blur would).
4. Divide each RGB channel by this field and rescale toward a paper reference (~245).

After this step, a shadowed corner and a bright center both read as similar paper white, and blue/grey washes keep their hue.

### 3. Stretch levels

A percentile normalize (`lower ≈ 0.5`, `upper ≈ 99`) maps:

- darkest ink → near black  
- paper → near white  

Faint pencil sits in the midtones, so it is not crushed to black or wiped out with the paper.

### 4. Encode + (for `plate`) write content

Output is WebP under `public/art/`. `npm run plate` also writes frontmatter Markdown (title, date, caption, image path, aspect ratio) into `content/feed/` or `content/form-construction/`.

Originals can live in `assets/` (gitignored). Only the processed WebP and Markdown are committed.

## Why not an AI model?

For this specific job — whitening grey paper and evening phone lighting while keeping ink and light pencil — classical illumination correction is enough:

- Deterministic and fast (no GPU, no API key)
- Does not invent or erase strokes
- Easy to tune (block size, percentiles, paper reference)

A learned cleanup model could help later for stains, show-through, or aggressive desk clutter. That would be an optional step on top of this pipeline, not a replacement for it.

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
