/**
 * Shared plate processing: greyscale phone photos of ink-on-paper,
 * flatten uneven lighting, and stretch the paper toward white.
 *
 * Classical illumination correction + histogram stretch — no ML needed
 * for these sketches. Fine pencil stays in the midtones; ink stays dark.
 */
import sharp from "sharp";

export const MAX_EDGE = 1800;
export const QUALITY = 82;

/** Percentiles for final levels stretch (paper → white, ink → black). */
const NORMALIZE_LOWER = 0.5;
const NORMALIZE_UPPER = 99;

/**
 * Estimate paper white with a coarse local-max field (ink is darker than
 * paper, so the bright response tracks illumination). Divide it out so
 * shadowed corners lift with the rest of the page.
 */
function flattenIllumination(raw, width, height) {
  const short = Math.min(width, height);
  const block = Math.max(12, Math.round(short / 40));
  const cols = Math.ceil(width / block);
  const rows = Math.ceil(height / block);
  const field = Buffer.alloc(cols * rows);

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * block;
      const y0 = by * block;
      const x1 = Math.min(width, x0 + block);
      const y1 = Math.min(height, y0 + block);
      let max = 0;
      for (let y = y0; y < y1; y += 2) {
        const row = y * width;
        for (let x = x0; x < x1; x += 2) {
          const v = raw[row + x];
          if (v > max) max = v;
        }
      }
      field[by * cols + bx] = max < 1 ? 1 : max;
    }
  }

  // Bilinear upsample from block centers — smooth edges without the
  // long-range bleed that undoes shadowed-corner correction.
  const background = Buffer.allocUnsafe(width * height);
  const maxX = cols - 1;
  const maxY = rows - 1;
  for (let y = 0; y < height; y++) {
    const fy = Math.min(maxY, Math.max(0, (y + 0.5) / block - 0.5));
    const y0 = fy | 0;
    const y1 = y0 < maxY ? y0 + 1 : y0;
    const ty = fy - y0;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(maxX, Math.max(0, (x + 0.5) / block - 0.5));
      const x0 = fx | 0;
      const x1 = x0 < maxX ? x0 + 1 : x0;
      const tx = fx - x0;
      const v00 = field[y0 * cols + x0];
      const v10 = field[y0 * cols + x1];
      const v01 = field[y1 * cols + x0];
      const v11 = field[y1 * cols + x1];
      const v0 = v00 + (v10 - v00) * tx;
      const v1 = v01 + (v11 - v01) * tx;
      background[row + x] = Math.round(v0 + (v1 - v0) * ty);
    }
  }

  const out = Buffer.allocUnsafe(raw.length);
  const paperRef = 245;
  for (let i = 0; i < raw.length; i++) {
    const b = background[i] < 16 ? 16 : background[i];
    let v = Math.round((raw[i] / b) * paperRef);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    out[i] = v;
  }
  return out;
}

/**
 * @param {string} inputPath already-readable path (HEIC converted if needed)
 * @returns {Promise<{ buffer: Buffer, width: number, height: number }>}
 */
export async function processPlate(inputPath) {
  // rotate() applies EXIF orientation first; use the raw `info` size after
  // resize so portrait phone shots don't get swapped width/height.
  const { data, info } = await sharp(inputPath)
    .rotate()
    .greyscale()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const flattened = flattenIllumination(data, width, height);

  const buffer = await sharp(flattened, {
    raw: { width, height, channels: 1 },
  })
    .normalize({ lower: NORMALIZE_LOWER, upper: NORMALIZE_UPPER })
    .toColorspace("b-w")
    .webp({ quality: QUALITY })
    .toBuffer();

  const outMeta = await sharp(buffer).metadata();
  return {
    buffer,
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
  };
}
