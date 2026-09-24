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
/**
 * Brighter ink plates: clip paper harder toward white so grey paper
 * doesn't read as warm/cream against the site background.
 */
const BRIGHT_NORMALIZE_UPPER = 92;
const PAPER_REF = 245;
const BRIGHT_PAPER_REF = 252;

/**
 * @typedef {{ color?: boolean, brighter?: boolean }} ProcessOptions
 */

function channelPercentile(hist, total, p) {
  const target = (total * p) / 100;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

/**
 * Neutralize warm/yellow paper lighting before greyscale so phone photos
 * of cream paper don't keep a yellowish grade.
 */
function whiteBalanceRgb(rgb, width, height) {
  const pixels = width * height;
  const hist = [new Float64Array(256), new Float64Array(256), new Float64Array(256)];
  for (let i = 0, p = 0; i < pixels; i++, p += 3) {
    hist[0][rgb[p]]++;
    hist[1][rgb[p + 1]]++;
    hist[2][rgb[p + 2]]++;
  }

  const wr = Math.max(8, channelPercentile(hist[0], pixels, 96));
  const wg = Math.max(8, channelPercentile(hist[1], pixels, 96));
  const wb = Math.max(8, channelPercentile(hist[2], pixels, 96));
  const target = Math.max(wr, wg, wb);
  const sr = target / wr;
  const sg = target / wg;
  const sb = target / wb;

  if (Math.abs(sr - 1) < 0.01 && Math.abs(sg - 1) < 0.01 && Math.abs(sb - 1) < 0.01) {
    return rgb;
  }

  const out = Buffer.allocUnsafe(rgb.length);
  for (let p = 0; p < rgb.length; p += 3) {
    out[p] = Math.min(255, Math.round(rgb[p] * sr));
    out[p + 1] = Math.min(255, Math.round(rgb[p + 1] * sg));
    out[p + 2] = Math.min(255, Math.round(rgb[p + 2] * sb));
  }
  return out;
}

function toGreyscale(rgb, width, height) {
  const pixels = width * height;
  const out = Buffer.allocUnsafe(pixels);
  for (let i = 0, p = 0; i < pixels; i++, p += 3) {
    out[i] = Math.round(
      rgb[p] * 0.299 + rgb[p + 1] * 0.587 + rgb[p + 2] * 0.114
    );
  }
  return out;
}

/**
 * Manual percentile stretch. sharp.normalize() on 1-channel raw buffers
 * introduces a 3-row banding artifact, so we do levels ourselves for ink.
 */
function stretchLevels(buf, channels, lower, upper) {
  const pixels = buf.length / channels;
  const hist = new Float64Array(256);
  for (let i = 0, p = 0; i < pixels; i++, p += channels) {
    // Use luma / first channel for the histogram.
    if (channels === 1) {
      hist[buf[p]]++;
    } else {
      hist[
        Math.round(buf[p] * 0.299 + buf[p + 1] * 0.587 + buf[p + 2] * 0.114)
      ]++;
    }
  }

  const lo = channelPercentile(hist, pixels, lower);
  const hi = Math.max(lo + 1, channelPercentile(hist, pixels, upper));
  const scale = 255 / (hi - lo);
  const out = Buffer.allocUnsafe(buf.length);
  for (let p = 0; p < buf.length; p++) {
    let v = Math.round((buf[p] - lo) * scale);
    if (v < 0) v = 0;
    if (v > 255) v = 255;
    out[p] = v;
  }
  return out;
}

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
 * Soft lift on the brightest paper only — avoids cream cast next to the
 * white site field without washing midtone washes.
 */
function liftInkPaper(mono) {
  const out = Buffer.allocUnsafe(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const v = mono[i];
    if (v >= 210) {
      const t = (v - 210) / 45;
      out[i] = Math.round(238 + t * 17);
    } else if (v >= 195) {
      const t = (v - 195) / 15;
      out[i] = Math.round(v + t * 6);
    } else {
      out[i] = v;
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

  const { data: rgb, info } = await sharp(inputPath)
    .rotate()
    .removeAlpha()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const balanced = whiteBalanceRgb(rgb, width, height);

  let raw;
  let channels;
  if (color) {
    raw = balanced;
    channels = 3;
  } else {
    raw = toGreyscale(balanced, width, height);
    channels = 1;
  }

  let leveled = flattenIllumination(raw, width, height, channels, paperRef);
  leveled = stretchLevels(leveled, channels, NORMALIZE_LOWER, normalizeUpper);

  if (brighter && channels === 1) {
    leveled = liftInkPaper(leveled);
  }

  let out = sharp(leveled, { raw: { width, height, channels } });
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
