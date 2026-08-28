# charminglines

Notes and plates for constructing 3D form in perspective. White field, sticky tracked header, a James Jean–style image grid for the feed, and a WordPress-style reading layout for drafting notes.

The GitHub repo is [mchoi-cs/drafting-notes](https://github.com/mchoi-cs/drafting-notes). The site name is charminglines. On Vercel it can live at `charminglines.vercel.app` — pushing to `main` is the deploy.

## What’s here

| Area | Route | What it is |
|------|--------|------------|
| Feed | `/` | Image grid of plates, newest first |
| Form Construction | `/form-construction` | The same grid, only construction plates |
| A plate | `/form-construction/[slug]` | Drawing, caption, date, optional notes |
| Drafting Meta | `/drafting-meta` | Title / date / excerpt list |
| A note | `/drafting-meta/[slug]` | Long-form post |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding a plate (from Cursor, not the site)

Drop or send a photo in this workspace, then:

```bash
npm run plate -- ./photo.jpg --caption "Two-point boxes" --section form-construction
```

That greyscales the image, writes a web-sized copy to `public/art/`, and creates a Markdown file in `content/` with the caption and today’s date. Commit and push to put it on Vercel.

```bash
npm run post -- "Why boxes first" drafting-meta
```

starts a writing-only note.

Front matter for a plate:

```md
---
title: "Boxes in space"
date: "2026-08-28"
caption: "Two-point boxes on a ground plane."
excerpt: "Two-point boxes on a ground plane."
image: "/art/boxes-in-space.webp"
aspectRatio: "4 / 5"
---
```

## Deploying on Vercel

Connect this GitHub repo to a new Vercel project named **charminglines**. Framework preset is Next.js. After that, every push to `main` publishes.

Phone → Cursor workspace → plate script → `git push` → the live site updates.
