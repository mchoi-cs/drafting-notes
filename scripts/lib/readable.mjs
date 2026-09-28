/** sharp has no HEIC decoder, so lean on the converter macOS already ships. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

const run = promisify(execFile);

export async function readable(file) {
  if (!/\.heic$/i.test(file)) return file;
  const staged = path.join(os.tmpdir(), `${path.parse(file).name}.png`);
  await run("sips", ["-s", "format", "png", file, "--out", staged]);
  return staged;
}
