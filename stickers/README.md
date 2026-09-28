# stickers

White-line overlays for video. Each file is `<slug>-white.png`: the drawn lines
are pure white, the paper is fully transparent, so the drawing can sit straight
on top of a TikTok / Instagram clip.

These are **committed on purpose but never published**. This folder is outside
`public/`, and `.vercelignore` keeps it out of deploys, so nothing here is
served from charminglines.vercel.app. Git is only the delivery route: new files
here get pulled from GitHub and copied into Michelle's Mac at
`creative-assets/stickers`.

Made by the plate pipeline:

```bash
# alongside a new plate
npm run plate -- ./photo.jpg --caption "Shells and starfish" --sticker

# for a plate that is already on the site
npm run sticker -- public/art/shells-and-starfish.webp

# light pencil or pale grey brush that would vanish over video
npm run sticker -- public/art/bull-chimera-2.webp --boost 1.8
```

See [docs/plate-pipeline.md](../docs/plate-pipeline.md).
