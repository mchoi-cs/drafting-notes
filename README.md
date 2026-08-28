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

That greyscales the image, writes a web copy to `public/art/`, and creates Markdown in `content/` with the caption and today’s date.

```bash
npm run post -- "Why boxes first" drafting-meta
```

starts a writing-only note.

## Deploying

If the GitHub repo is connected to the Vercel project, push `main` to publish. Until that Git connection is on, deploy with `npx vercel --prod`.
