/* Renders the continuous camera flight over the crypto world as 5 video legs
   with frame-identical seams (one global path, cut at frame boundaries), plus
   one settle-frame still per scene.

   Camera = (cx, cy, w): crop center + crop width in world px (h = w * 9/16).
   Background parallaxes at a fraction of camera translation. */
const sharp = require("sharp");
const { spawn } = require("child_process");
const fs = require("fs");

const OUT_W = 1920, OUT_H = 1080;
const FPS = 30, FRAMES_PER_LEG = 168;
const WORLD_W = 9600, WORLD_H = 3600;
const BG_W = 4800, BG_H = 1800;

// keyframes: [u, cx, cy, w] — settles at x.5 on each scene
const KEYS = [
  [0.0, 2400, 2050, 4200],
  [0.5, 2000, 2350, 2100],
  [1.0, 2800, 1800, 3200],
  [1.5, 3600, 1250, 2100],
  [2.0, 4400, 1800, 3300],
  [2.5, 5200, 2350, 2100],
  [3.0, 6000, 1800, 3300],
  [3.5, 6800, 1200, 2100],
  [4.0, 7550, 1800, 3200],
  [4.5, 8300, 2400, 2060],
  [5.0, 8300, 2430, 2350],
];
const LEGS = ["chain", "consensus", "contracts", "vault", "studio"];

// Catmull-Rom over irregular-but-uniform u grid (0.5 spacing)
function evalCam(u) {
  const step = 0.5;
  let i = Math.min(Math.floor(u / step), KEYS.length - 2);
  const t = (u - KEYS[i][0]) / step;
  const get = (k) => KEYS[Math.max(0, Math.min(KEYS.length - 1, k))];
  const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
  const cr = (a, b, c, d) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
  };
  // interpolate zoom in log space for perceptually even zoom speed
  return {
    cx: cr(p0[1], p1[1], p2[1], p3[1]),
    cy: cr(p0[2], p1[2], p2[2], p3[2]),
    w: Math.exp(cr(Math.log(p0[3]), Math.log(p1[3]), Math.log(p2[3]), Math.log(p3[3]))),
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

async function main() {
  console.log("loading layers…");
  const world = {
    buf: await sharp("world.png").raw().toBuffer(),
    w: WORLD_W, h: WORLD_H, ch: 4,
  };
  const bg = {
    buf: await sharp("bg.png").removeAlpha().raw().toBuffer(),
    w: BG_W, h: BG_H, ch: 3,
  };

  fs.mkdirSync("out", { recursive: true });

  async function renderFrame(u) {
    const cam = evalCam(u);
    // world crop
    let w = clamp(cam.w, 400, WORLD_W);
    let h = w * (OUT_H / OUT_W);
    let x = clamp(cam.cx - w / 2, 0, WORLD_W - w);
    let y = clamp(cam.cy - h / 2, 0, WORLD_H - h);
    // bg crop (parallax: 22% translation, 28% zoom coupling)
    let wb = 1400 + w * 0.28;
    let hb = wb * (OUT_H / OUT_W);
    let xb = clamp(BG_W / 2 + (cam.cx - WORLD_W / 2) * 0.22 - wb / 2, 0, BG_W - wb);
    let yb = clamp(900 + (cam.cy - 1800) * 0.12 - hb / 2, 0, BG_H - hb);

    const [bgCrop, worldCrop] = await Promise.all([
      sharp(bg.buf, { raw: { width: bg.w, height: bg.h, channels: 3 } })
        .extract({ left: Math.round(xb), top: Math.round(yb), width: Math.round(wb), height: Math.round(hb) })
        .resize(OUT_W, OUT_H, { kernel: "lanczos3" })
        .toBuffer(),
      sharp(world.buf, { raw: { width: world.w, height: world.h, channels: 4 } })
        .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
        .resize(OUT_W, OUT_H, { kernel: "lanczos3" })
        .png()
        .toBuffer(),
    ]);

    const frame = await sharp(bgCrop, { raw: { width: OUT_W, height: OUT_H, channels: 3 } })
      .composite([{ input: worldCrop }])
      .removeAlpha()
      .raw()
      .toBuffer();
    if (frame.length !== OUT_W * OUT_H * 3) {
      throw new Error(`frame stride mismatch: ${frame.length} !== ${OUT_W * OUT_H * 3}`);
    }
    return frame;
  }

  for (let leg = 0; leg < LEGS.length; leg++) {
    const name = LEGS[leg];
    console.log(`leg ${leg + 1}/5 — ${name}`);
    const ff = spawn("ffmpeg", [
      "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
      "-s", `${OUT_W}x${OUT_H}`, "-r", String(FPS), "-i", "-",
      "-an", "-vf", "unsharp=5:5:0.6:5:5:0.0",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-pix_fmt", "yuv420p", "-g", "8", "-keyint_min", "8",
      "-sc_threshold", "0", "-movflags", "+faststart",
      `out/${name}.mp4`,
    ], { stdio: ["pipe", "ignore", "pipe"] });
    let ffErr = "";
    ff.stderr.on("data", (d) => { ffErr += d; ffErr = ffErr.slice(-4000); });
    const done = new Promise((res, rej) =>
      ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg ${code}\n${ffErr}`))))
    );

    for (let k = 0; k < FRAMES_PER_LEG; k++) {
      const u = leg + k / FRAMES_PER_LEG;
      const frame = await renderFrame(u);
      if (!ff.stdin.write(frame)) {
        await new Promise((res) => ff.stdin.once("drain", res));
      }
      if (k === Math.round(FRAMES_PER_LEG / 2)) {
        // settle frame → still poster
        await sharp(frame, { raw: { width: OUT_W, height: OUT_H, channels: 3 } })
          .webp({ quality: 82 })
          .toFile(`out/${name}.webp`);
      }
      if (k % 42 === 0) process.stdout.write(`  frame ${k}/${FRAMES_PER_LEG}\r`);
    }
    ff.stdin.end();
    await done;
    console.log(`  ${name}.mp4 + ${name}.webp done`);
  }
  console.log("all legs rendered");
}

main().catch((e) => { console.error(e); process.exit(1); });
