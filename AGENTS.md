<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Adding a drawing

Michelle sends a photo of a drawing. One command handles it:

```bash
npm run plate -- ./photo.jpg --caption "Shells and starfish"
```

Add `--color` for watercolor or ink washes, `--section form-construction` for a deliberate perspective plate. Everything else about that pipeline is in [docs/plate-pipeline.md](docs/plate-pipeline.md). Commit the WebP and the Markdown it writes.

## Also pass `--sticker` when she asks for one

If she says **sticker**, **overlay**, **creative assets**, **white lines**, or anything about putting the drawing over a video (TikTok, Instagram, Reels), add `--sticker`:

```bash
npm run plate -- ./photo.jpg --caption "Shells and starfish" --sticker
```

That writes `stickers/<slug>-white.png` — the drawn lines in pure white on a fully transparent background — next to the normal plate.

For a drawing already on the site, no new photo needed:

```bash
npm run sticker -- public/art/<slug>.webp
```

If the drawing is light pencil or a pale grey brush, the lines come out faint on purpose. Add `--sticker-boost 1.8` (or `--boost 1.8` on `npm run sticker`) and they read over busy video.

**Commit the PNG.** `stickers/` is outside `public/` so it never ships with the site; committing is the only way the file leaves the cloud and reaches her Mac — her assistant pulls new files in that folder from GitHub. A sticker you generate but do not commit is a sticker she never gets.

Do not pass `--sticker` when she has not asked for one, and never put stickers under `public/`.
