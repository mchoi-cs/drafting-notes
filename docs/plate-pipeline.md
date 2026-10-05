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

# Also export a white-line overlay for video
npm run plate -- ./photo.jpg --caption "Shells and starfish" --sticker

# Finished digital piece, lying on its side with no EXIF tag
npm run plate -- ./export.jpg --caption "Airplane" --as-is --rotate 270
```

Optional flags: `--title`, `--date` (`YYYY-MM-DD`), `--slug` (overwrite an existing plate), `--color`, `--sticker`, `--sticker-boost`, `--as-is`, `--rotate`.

Default processing is **greyscale** (most plates). Pass `--color` to keep hue; that also sets `color: true` in the Markdown so the Feed can filter **All / Ink / Color**.

Batch convert originals in `assets/` (no Markdown):

```bash
npm run art          # skip files that already exist in public/art/
npm run art -- --force
npm run art -- --sticker    # also fill in stickers/ for everything in assets/
```

## What it does

Both `npm run plate` and `npm run art` call the same processor: [`scripts/lib/process-plate.mjs`](../scripts/lib/process-plate.mjs).

```
photo (jpg / png / heic…)
        │
        ▼
  EXIF rotate  (openOriented — the one place straightening lives)
        │
        ├──────────────────────────────┐
        ▼                              ▼
  white-balance paper            (--sticker only)
  (greyscale unless --color)      full-resolution white-line export
  resize to 1800px                        │
        │                                 ▼
        ▼                        local paper brightness → alpha ramp
  Flatten uneven lighting        → despeckle → trim
  (local-max paper field ÷ divide-out)      │
        │                                 ▼
        ▼                        PNG → stickers/<slug>-white.png
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

Ink plates use a **soft paper-white grade** (scale the bright paper percentile toward ~242) instead of a hard black-point stretch. That keeps washes in the greys, closer to early feed plates like bird-woman-study. Color plates still use a fuller levels stretch so hue stays punchy.

### 4. Encode + write content

Output is WebP under `public/art/`. `npm run plate` also writes frontmatter (title, date, caption, image, aspect ratio, `color`) into `content/`.

The Feed UI reads `color` and offers **All / Ink / Color** filters when at least one color plate exists.

## Digital pieces (`--as-is`)

Everything above is a fix for a **photograph of paper**: cream paper, a vignette, a page that is not white. A finished digital piece — a HeavyPaint export, say — has none of those problems, so correcting them anyway just recolors the artist's choices. On the `airplane` plate the paper passes read its cool grey-mauve field as badly lit cream paper and pushed it hot pink, and lifted the dark mass the composition sits on.

`--as-is` skips white-balance, illumination flattening and levels, leaving orient → resize → WebP:

```bash
npm run plate -- ./export.jpg --caption "Airplane" --as-is
```

Hue is always kept in this mode, so `--color` is unnecessary. The Markdown's `color:` field is read off the pixels instead of the flag — a neutral piece still files under **Ink**, a colored one under **Color** — so the Feed filter stays truthful without a second flag.

## Rotation (`--rotate`)

`sharp` applies EXIF orientation automatically, which covers phone photos. App exports and screenshots often carry **no** orientation tag at all while the pixels are still sideways, and nothing downstream can guess. `--rotate 90` (or `180` / `270`, degrees clockwise) bakes in the quarter turn:

```bash
npm run plate -- ./export.jpg --caption "Airplane" --rotate 270
```

Which way is up is a question about the **drawing**, not the file, and there is no metadata left to check. The `airplane` plate went up 180° wrong on the first attempt because the turn was reasoned out from the subject — a propeller read as an eye — instead of confirmed with Michelle. Show her the rotated image and get a yes before committing.

It composes with the EXIF turn rather than replacing it, and it is applied in [`openOriented`](../scripts/lib/process-plate.mjs), so a `--sticker` export of the same photo comes out the same way up as its plate.

## Sticker export (`--sticker`)

Michelle overlays her drawings on TikTok / Instagram clips, which needs the opposite of a plate: no paper at all. `--sticker` writes a second file, `stickers/<slug>-white.png`, where the strokes are pure white `#FFFFFF` and everything else — paper, grain, the shadow in the corner — is fully transparent.

Nothing changes when the flag is absent. The plate WebP and Markdown are byte-for-byte what they were before the flag existed.

```bash
npm run plate -- ./photo.jpg --caption "Shells and starfish" --sticker
npm run plate -- ./photo.jpg --caption "Bull chimera" --sticker --sticker-boost 1.8

npm run sticker -- public/art/shells-and-starfish.webp   # backfill one plate
npm run art -- --sticker                                  # backfill all of assets/
```

### Why it is not just "invert the plate"

The site WebP has already been pushed toward white paper and resized to 1800px, so inverting it gives ragged, halo-ringed lines. The sticker instead reads the **original photo at full resolution**, sharing only the orientation step ([`openOriented`](../scripts/lib/process-plate.mjs)) with the plate, so both come off the same pixels. Add real perspective straightening there later and both follow.

### How alpha is found

1. **Greyscale luminance** `L` at full resolution.
2. **Local paper brightness**: 90th-percentile filter (31px window) on a copy resized to a 450px long edge — bright paper wins, ink loses — then floored at half the brightest paper, blurred, and upsampled. A phone shadow makes the *paper* dark, not the ink, so a global threshold would turn that corner into a grey slab; a local one does not.
3. **Darkness** `d = (paper − L) / paper`, then alpha is a **smoothstep** from `d = 0.11` (paper grain, invisible) to `d = 0.42` (solid stroke). The smooth ramp is what keeps edges anti-aliased. Because RGB is a constant 255, a partly transparent edge pixel can never show a grey fringe.
4. **Despeckle**: 8-connected blobs of `alpha > 0.25`; drop anything under ~60px, and drop small blobs (<2500px) sitting within ~70px of the frame — page edge, tape, a thumb, a pencil signature in the margin. Alpha is zeroed outside a 3px dilation of the survivors, so real strokes keep their soft skirt.
5. **Trim** to pixels with `alpha > 8/255` plus 24px of padding.

Those pixel sizes are quoted at an 1800px long edge and scale with the input, so a 12MP phone photo and the 1800px WebP of the same drawing give the same sticker at different resolutions. A 12MP photo takes about two seconds.

### `--sticker-boost`

A pale grey brush stroke is *genuinely* low-contrast, so it comes out semi-transparent and can disappear over busy video. `--sticker-boost 1.8` (a gamma on alpha, default `1`) bends the faint end up. It is applied **after** despeckling and trimming, so raising opacity cannot also resurrect paper grain or change what the sticker contains. Worth trying on light pencil or pale washes; ink does not need it.

### Where the file goes

`stickers/` is not under `public/`, and `.vercelignore` skips it, so stickers never ship with the site. They are committed anyway — GitHub is the delivery route to Michelle's Mac. `STICKER_DIR` overrides the folder for a one-off run. **A sticker that is not committed never arrives.**

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
| [`scripts/lib/process-plate.mjs`](../scripts/lib/process-plate.mjs) | Shared orient + flatten + normalize + WebP |
| [`scripts/lib/sticker.mjs`](../scripts/lib/sticker.mjs) | White-on-transparent overlay PNG |
| [`scripts/lib/readable.mjs`](../scripts/lib/readable.mjs) | HEIC → PNG via macOS `sips` |
| [`scripts/ingest-plate.mjs`](../scripts/ingest-plate.mjs) | `npm run plate` — process + Markdown |
| [`scripts/make-sticker.mjs`](../scripts/make-sticker.mjs) | `npm run sticker` — sticker only, no site change |
| [`scripts/prepare-art.mjs`](../scripts/prepare-art.mjs) | `npm run art` — batch `assets/` → `public/art/` |
| [`scripts/new-post.mjs`](../scripts/new-post.mjs) | `npm run post` — writing-only note |
| [`src/components/FeedGallery.tsx`](../src/components/FeedGallery.tsx) | Feed All / Ink / Color filter |
