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

Everything on the feed is also published at
**[charminglines.vercel.app/feed.json](https://charminglines.vercel.app/feed.json)** so other
sites can show the newest plates. [mchoi-cs/myart](https://github.com/mchoi-cs/myart) reads it
on `/charminglines`.

It is an array, newest first, generated at build time from `content/feed` — one entry per plate:

```json
[
  {
    "slug": "shells-and-starfish",
    "title": "Shells and starfish",
    "caption": "Shells and starfish",
    "date": "2026-09-24",
    "image": "https://charminglines.vercel.app/art/shells-and-starfish.webp",
    "aspectRatio": "1350 / 1800",
    "wide": false,
    "color": false,
    "href": "https://charminglines.vercel.app/feed/shells-and-starfish"
  }
]
```

`image` and `href` are absolute so a consumer can use them as-is, and the response sends
`Access-Control-Allow-Origin: *` so a browser on another origin can fetch it. There is no
route to update: publish a plate and the next deploy rebuilds the file.

## Deploying

If the GitHub repo is connected to the Vercel project, push `main` to publish. Until that Git connection is on, deploy with `npx vercel --prod`.
