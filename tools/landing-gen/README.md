# landing-gen

Regenerates the assets behind the `/` landing page — a scroll-scrubbed
"fly through the crypto world" cinematic built with
[scroll-world](https://github.com/0xrlawrence/scroll-world)'s scrub engine.

## How it works

1. `gen-world.js` — authors one big isometric "crypto world" SVG
   (5 scenes: the chain → consensus → smart contracts → the vault → the studio)
   plus a deep-space background layer.
2. `render-flight.js` — flies a Catmull-Rom camera path over the panorama
   (with background parallax) and pipes raw frames into ffmpeg, producing one
   MP4 leg per scene (crf 20, GOP 8, faststart — per the scroll-world encode
   spec) and one settle-frame `.webp` poster per scene.

Because all 5 legs are cut from a single continuous flight at exact frame
boundaries, every seam is frame-identical by construction — the engine's
"seamless chain" rule (scroll-world SKILL step 5) is satisfied without any
connector clips (`connectors: []`, architecture A).

## Usage

Requires ffmpeg on `$PATH`.

```bash
npm install
npm run all      # world → rasterize → render → copy into public/scroll-world/assets/
```

Scene copy/config lives in `components/ScrollWorld.tsx`.
