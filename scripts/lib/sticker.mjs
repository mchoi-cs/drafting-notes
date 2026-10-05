/**
 * White-line sticker export.
 *
 * Takes the same photo the plate pipeline takes and returns a PNG where the
 * strokes are pure white (#FFFFFF), the paper and its grain are fully
 * transparent, and the edges stay soft. Michelle drops these over video.
 *
 * The plate pipeline lifts paper toward white; a sticker needs the opposite
 * answer — per-pixel "how much ink is here" — so alpha comes from how dark a
 * pixel is compared with the *local* paper brightness. That keeps a shadowed
 * corner from turning into a grey slab. Runs on the original photo at full
 * resolution, not on the 1800px site WebP.
 */
import path from "node:path";
import sharp from "sharp";
import { openOriented, toGreyscale } from "./process-plate.mjs";

/** Tuning was found on 1800px plates; pixel sizes below scale from this. */
const REFERENCE_EDGE = 1800;

/** Paper brightness is a slow field — estimate it small, then upsample. */
const BACKGROUND_EDGE = 450;
const BACKGROUND_WINDOW = 31;
const BACKGROUND_PERCENTILE = 90;
/** Never believe a paper estimate darker than this share of the brightest paper. */
const BACKGROUND_FLOOR = 0.5;
const BACKGROUND_BLUR = 8;

/** Ink ramp: below `lo` is paper grain, above `hi` is solid stroke. */
const DARK_LO = 0.11;
const DARK_HI = 0.42;

/** Speck removal, in pixels at REFERENCE_EDGE. */
const SPECK_ALPHA = 64;
const SPECK_MIN_AREA = 60;
const BORDER_SPECK_MAX_AREA = 2500;
const BORDER_MARGIN = 70;
const KEEP_DILATION = 3;

const TRIM_ALPHA = 8;
const TRIM_PADDING = 24;

/**
 * @typedef {{ boost?: number, rotate?: number }} StickerOptions
 * @typedef {{ buffer: Buffer, width: number, height: number,
 *             sourceWidth: number, sourceHeight: number,
 *             specksRemoved: number }} Sticker
 */

/** `${slug}-white.png` — the name Michelle's assistant looks for. */
export function stickerFileName(slug) {
  return `${slug}-white.png`;
}

/**
 * Stickers live outside `public/` on purpose: they are committed so they reach
 * Michelle's Mac through GitHub, not so they ship with the site.
 */
export function stickerDir(root) {
  return process.env.STICKER_DIR
    ? path.resolve(root, process.env.STICKER_DIR)
    : path.join(root, "stickers");
}

/**
 * Sliding-window percentile over an 8-bit plane, via per-column histograms.
 * Edges clamp to the nearest row/column so the field stays defined there.
 */
function percentileFilter(src, width, height, radius, percentile) {
  const out = new Uint8Array(width * height);
  const columns = new Int32Array(width * 256);
  const frame = new Int32Array(256);

  for (let x = 0; x < width; x++) {
    const base = x * 256;
    for (let dy = -radius; dy <= radius; dy++) {
      const y = Math.min(height - 1, Math.max(0, dy));
      columns[base + src[y * width + x]]++;
    }
  }

  const side = 2 * radius + 1;
  const target = Math.max(1, Math.ceil((side * side * percentile) / 100));

  for (let y = 0; y < height; y++) {
    if (y > 0) {
      const enter = Math.min(height - 1, y + radius) * width;
      const leave = Math.max(0, y - radius - 1) * width;
      for (let x = 0; x < width; x++) {
        const base = x * 256;
        columns[base + src[enter + x]]++;
        columns[base + src[leave + x]]--;
      }
    }

    frame.fill(0);
    for (let dx = -radius; dx <= radius; dx++) {
      const base = Math.min(width - 1, Math.max(0, dx)) * 256;
      for (let v = 0; v < 256; v++) frame[v] += columns[base + v];
    }

    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      let v = 0;
      for (; v < 255; v++) {
        acc += frame[v];
        if (acc >= target) break;
      }
      out[row + x] = v;

      if (x + 1 < width) {
        const enter = Math.min(width - 1, x + radius + 1) * 256;
        const leave = Math.max(0, x - radius) * 256;
        for (let i = 0; i < 256; i++) {
          frame[i] += columns[enter + i] - columns[leave + i];
        }
      }
    }
  }

  return out;
}

/** Local paper brightness, full resolution, 1 byte per pixel. */
async function paperBrightness(grey, width, height) {
  const long = Math.max(width, height);
  const coarse = {
    width: Math.max(16, Math.round((width / long) * BACKGROUND_EDGE)),
    height: Math.max(16, Math.round((height / long) * BACKGROUND_EDGE)),
    channels: 1,
  };

  const shrunk = await sharp(grey, { raw: { width, height, channels: 1 } })
    .resize({ width: coarse.width, height: coarse.height, fit: "fill" })
    .raw()
    .toBuffer();

  const field = percentileFilter(
    shrunk,
    coarse.width,
    coarse.height,
    Math.floor(BACKGROUND_WINDOW / 2),
    BACKGROUND_PERCENTILE
  );

  // The downsample already smoothed away hot pixels, so its max is a safe
  // stand-in for "brightest paper".
  let brightest = 1;
  for (let i = 0; i < shrunk.length; i++) {
    if (shrunk[i] > brightest) brightest = shrunk[i];
  }
  const floor = Math.round(BACKGROUND_FLOOR * brightest);
  for (let i = 0; i < field.length; i++) {
    if (field[i] < floor) field[i] = floor;
  }

  // Two passes on purpose: sharp runs blur after resize whatever the call
  // order, and the field has to be smoothed while it is still small.
  const smoothed = await sharp(
    Buffer.from(field.buffer, field.byteOffset, field.length),
    { raw: coarse }
  )
    .blur((BACKGROUND_BLUR * BACKGROUND_EDGE) / REFERENCE_EDGE)
    .raw()
    .toBuffer();

  return sharp(smoothed, { raw: coarse })
    .resize({ width, height, fit: "fill", kernel: "cubic" })
    .raw()
    .toBuffer();
}

/** Alpha = smoothstep over darkness relative to local paper. */
function inkAlpha(grey, paper) {
  const alpha = new Uint8Array(grey.length);
  const span = DARK_HI - DARK_LO;

  for (let i = 0; i < grey.length; i++) {
    const bg = paper[i] < 1 ? 1 : paper[i];
    const darkness = (bg - grey[i]) / bg;
    let t = (darkness - DARK_LO) / span;
    if (t <= 0) continue;
    if (t > 1) t = 1;
    alpha[i] = Math.round(t * t * (3 - 2 * t) * 255);
  }

  return alpha;
}

/**
 * Bend surviving alpha upward so a light grey brush stroke still reads over
 * busy video. Applied after speck removal on purpose — boosting opacity must
 * not also resurrect paper grain or change what the sticker contains.
 */
function boostAlpha(alpha, boost) {
  if (boost === 1) return;
  const gamma = 1 / boost;
  const curve = new Uint8Array(256);
  for (let v = 1; v < 256; v++) {
    curve[v] = Math.round(Math.pow(v / 255, gamma) * 255);
  }
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i]) alpha[i] = curve[alpha[i]];
  }
}

/** Binary dilation by a square radius, as two running-sum passes. */
function dilate(mask, width, height, radius) {
  if (radius < 1) return mask;
  const pass = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    let hits = 0;
    for (let x = 0; x <= radius && x < width; x++) hits += mask[row + x];
    for (let x = 0; x < width; x++) {
      pass[row + x] = hits > 0 ? 1 : 0;
      const enter = x + radius + 1;
      const leave = x - radius;
      if (enter < width) hits += mask[row + enter];
      if (leave >= 0) hits -= mask[row + leave];
    }
  }

  const out = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    let hits = 0;
    for (let y = 0; y <= radius && y < height; y++) hits += pass[y * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = hits > 0 ? 1 : 0;
      const enter = y + radius + 1;
      const leave = y - radius;
      if (enter < height) hits += pass[enter * width + x];
      if (leave >= 0) hits -= pass[leave * width + x];
    }
  }

  return out;
}

/**
 * Drop dust and desk clutter: tiny blobs anywhere, plus small blobs hugging
 * the frame (page edge, tape, a thumb). Surviving blobs keep a little margin
 * so their own anti-aliased skirt is not clipped.
 */
function removeSpecks(alpha, width, height, scale) {
  const minArea = Math.max(4, Math.round(SPECK_MIN_AREA * scale * scale));
  const borderArea = Math.max(minArea, Math.round(BORDER_SPECK_MAX_AREA * scale * scale));
  const margin = Math.max(1, Math.round(BORDER_MARGIN * scale));

  let seeds = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > SPECK_ALPHA) seeds++;
  }
  if (seeds === 0) return { alpha, specksRemoved: 0 };

  const VISITED = 1;
  const SOLID = 2;
  const state = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > SPECK_ALPHA) state[i] = SOLID;
  }

  const queue = new Int32Array(seeds);
  const keep = new Uint8Array(alpha.length);
  let specksRemoved = 0;

  for (let start = 0; start < alpha.length; start++) {
    if (state[start] !== SOLID) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    state[start] = VISITED;

    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x + 1 < width ? x + 1 : width - 1;
      const y0 = y > 0 ? y - 1 : 0;
      const y1 = y + 1 < height ? y + 1 : height - 1;
      for (let ny = y0; ny <= y1; ny++) {
        const row = ny * width;
        for (let nx = x0; nx <= x1; nx++) {
          const neighbour = row + nx;
          if (state[neighbour] === SOLID) {
            state[neighbour] = VISITED;
            queue[tail++] = neighbour;
          }
        }
      }
    }

    const area = tail;
    const nearBorder =
      minX < margin ||
      minY < margin ||
      maxX >= width - margin ||
      maxY >= height - margin;

    if (area < minArea || (nearBorder && area < borderArea)) {
      specksRemoved++;
      continue;
    }
    for (let i = 0; i < tail; i++) keep[queue[i]] = 1;
  }

  const allowed = dilate(keep, width, height, Math.max(1, Math.round(KEEP_DILATION * scale)));
  for (let i = 0; i < alpha.length; i++) {
    if (!allowed[i]) alpha[i] = 0;
  }

  return { alpha, specksRemoved };
}

function contentBox(alpha, width, height, padding) {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (alpha[row + x] <= TRIM_ALPHA) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return { left: 0, top: 0, width, height };

  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  return {
    left,
    top,
    width: Math.min(width, maxX + padding + 1) - left,
    height: Math.min(height, maxY + padding + 1) - top,
  };
}

/**
 * @param {string} inputPath readable image (HEIC already converted)
 * @param {StickerOptions} [options]
 * @returns {Promise<Sticker>}
 */
export async function makeSticker(inputPath, options = {}) {
  const boost = Number(options.boost) > 0 ? Number(options.boost) : 1;

  // Same orientation/straightening step the plate gets, but no resize: the
  // sticker is cut from the original pixels.
  const { data: rgb, info } = await openOriented(inputPath, options.rotate)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const grey =
    info.channels === 1 ? rgb : toGreyscale(rgb, width, height, info.channels);
  const scale = Math.max(width, height) / REFERENCE_EDGE;

  const paper = await paperBrightness(grey, width, height);
  const { alpha, specksRemoved } = removeSpecks(
    inkAlpha(grey, paper),
    width,
    height,
    scale
  );
  const box = contentBox(
    alpha,
    width,
    height,
    Math.max(1, Math.round(TRIM_PADDING * scale))
  );
  boostAlpha(alpha, boost);

  const rgba = Buffer.allocUnsafe(width * height * 4);
  rgba.fill(255);
  for (let i = 0, p = 3; i < alpha.length; i++, p += 4) {
    rgba[p] = alpha[i];
  }

  const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(box)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    buffer,
    width: box.width,
    height: box.height,
    sourceWidth: width,
    sourceHeight: height,
    specksRemoved,
  };
}
