# charminglines

Notes and plates for constructing 3D form in perspective. White field, sticky tracked header, a James Jean–style image grid, and a WordPress-style reading layout for drafting notes.

Live at [charminglines.vercel.app](https://charminglines.vercel.app). Repo: [mchoi-cs/drafting-notes](https://github.com/mchoi-cs/drafting-notes).

## What’s here

| Area | Route | What it is |
|------|--------|------------|
| Feed | `/` | Casual phone uploads, newest first. Not curated. |
| A feed plate | `/feed/[slug]` | That drawing, caption, date |
| Form Construction | `/form-construction` | Intentional construction plates |
| Drafting Meta | `/drafting-meta` | Title / date / excerpt list |
| The feed as JSON | `/feed.json` | The same plates as data, for other sites |

Phone uploads go to the feed. Form construction is only for pieces you mean to file there.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding a plate from Cursor

Send a photo in this workspace. By default it lands on the feed:

```bash
npm run plate -- ./photo.jpg --caption "Two-point boxes"
```

To file it as a construction plate instead:

```bash
npm run plate -- ./photo.jpg --caption "Two-point boxes" --section form-construction
```

That pipeline fixes orientation, flattens uneven phone lighting, stretches the paper toward white (greyscale by default; pass `--color` for washes), and writes WebP + Markdown. The Feed can filter **All / Ink / Color**. Details are in **[docs/plate-pipeline.md](docs/plate-pipeline.md)**.

Add `--sticker` to also get a white-lines-on-transparent PNG for video overlays:

```bash
npm run plate -- ./photo.jpg --caption "Shells and starfish" --sticker
```

It lands in [`stickers/`](stickers/), which is committed but never published.

```bash
npm run post -- "Why boxes first" drafting-meta
```

starts a writing-only note.

## The feed as JSON

[`/feed.json`](https://charminglines.vercel.app/feed.json) is the feed as data: every plate's slug, title, caption, date, aspect ratio, whether it is colour, and the paths to its image and its page. Newest first, so anyone who wants a handful takes them off the front.

[michellechoi-art.vercel.app/charminglines](https://michellechoi-art.vercel.app/charminglines) reads it to show the newest drawings from here. **Something else depends on this file**, so keep the route and keep the field names.

`src/app/feed.json/route.ts` builds it from the same Markdown the Feed page renders, at build time, and Vercel serves it as a static file. That means `npm run plate` is still the whole job: add a plate, push, and the plate is in the feed when the deploy lands. There is no index to update and nothing to run.

Two things it deliberately does not do. It describes nothing outside `content/feed`, so stickers (which are not part of the site at all, and which `.vercelignore` keeps out of the upload) can never appear in it. And `image` and `href` are paths rather than full URLs, so they resolve against whatever host served the file, which keeps preview deployments honest.

## Deploying

If the GitHub repo is connected to the Vercel project, push `main` to publish. Until that Git connection is on, deploy with `npx vercel --prod`.
