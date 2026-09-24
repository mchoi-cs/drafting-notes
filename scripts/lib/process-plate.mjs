/**
 * Shared plate processing: phone photos of ink-on-paper,
 * flatten uneven lighting, and stretch the paper toward white.
 *
 * Default is greyscale (most plates). Pass `{ color: true }` to keep
 * watercolor / ink washes. Illumination is estimated from a local-max
 * paper field. Classical correction — no ML needed.
 */
import sharp from "sharp";

export const MAX_EDGE = 1800;
export const QUALITY = 82;

/** Default levels — paper → white, ink → black. */
const NORMALIZE_LOWER = 0.5;
const NORMALIZE_UPPER = 99;
/** Brighter ink plates: clip paper a bit harder toward white. */
const BRIGHT_NORMALIZE_UPPER = 93;
const PAPER_REF = 245;
const BRIGHT_PAPER_REF = 252;

/**
 * @typedef {{ color?: boolean, brighter?: boolean }} ProcessOptions
 */

/**
 * Build a coarse local-max illumination field from a 1-channel buffer,
 * then bilinear-upsample it to full resolution.
 */
function paperField(mono, width, height) {
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
          const v = mono[row + x];
          if (v > max) max = v;
        }
      }
      field[by * cols + bx] = max < 1 ? 1 : max;
    }
  }

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
  return background;
}

function flattenIllumination(raw, width, height, channels, paperRef) {
  const pixels = width * height;
  const mono = Buffer.allocUnsafe(pixels);
  if (channels === 1) {
    raw.copy(mono);
  } else {
    for (let i = 0, p = 0; i < pixels; i++, p += channels) {
      let max = raw[p];
      for (let c = 1; c < channels; c++) {
        if (raw[p + c] > max) max = raw[p + c];
      }
      mono[i] = max;
    }
  }

  const background = paperField(mono, width, height);
  const out = Buffer.allocUnsafe(raw.length);
  for (let i = 0, p = 0; i < pixels; i++, p += channels) {
    const bg = background[i] < 16 ? 16 : background[i];
    const scale = paperRef / bg;
    for (let c = 0; c < channels; c++) {
      let v = Math.round(raw[p + c] * scale);
      if (v < 0) v = 0;
      if (v > 255) v = 255;
      out[p + c] = v;
    }
  }
  return out;
}

/**
 * @param {string} inputPath already-readable path (HEIC converted if needed)
 * @param {ProcessOptions} [options]
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, color: boolean }>}
 */
export async function processPlate(inputPath, options = {}) {
  const color = Boolean(options.color);
  const brighter = options.brighter !== false && !color;
  const paperRef = brighter ? BRIGHT_PAPER_REF : PAPER_REF;
  const normalizeUpper = brighter ? BRIGHT_NORMALIZE_UPPER : NORMALIZE_UPPER;

  let pipeline = sharp(inputPath).rotate().removeAlpha();
  if (!color) pipeline = pipeline.greyscale();

  const { data, info } = await pipeline
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const flattened = flattenIllumination(
    data,
    width,
    height,
    channels,
    paperRef
  );

  let out = sharp(flattened, {
    raw: { width, height, channels },
  }).normalize({ lower: NORMALIZE_LOWER, upper: normalizeUpper });

  if (!color) out = out.toColorspace("b-w");

  const buffer = await out.webp({ quality: QUALITY }).toBuffer();
  const outMeta = await sharp(buffer).metadata();
  return {
    buffer,
    width: outMeta.width ?? width,
    height: outMeta.height ?? height,
    color,
  };
}
