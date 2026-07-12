/* Generates world.svg (5 isometric crypto scenes, transparent bg) and bg.svg
   (deep-space backdrop). Isometric projection: right = (1, .5), left = (-1, .5). */
const fs = require("fs");

const W = 9600, H = 3600;
const BGW = 4800, BGH = 1800;

// deterministic pseudo-random (no Math.random — reproducible builds)
let seed = 1337;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- iso helpers ----------
const P = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** diamond with top corner at (cx, cy), "radius" s (width 2s, height s) */
const diamond = (cx, cy, s) => [
  [cx, cy], [cx + s, cy + s / 2], [cx, cy + s], [cx - s, cy + s / 2],
];

/** iso box: base diamond top-corner at (cx, cy), side s, height h.
    Returns polygons [top, right, left]. */
function isoBox(cx, cy, s, h, cols, opts = {}) {
  const t = diamond(cx, cy - h, s);
  const right = [[cx, cy - h + s], [cx + s, cy - h + s / 2], [cx + s, cy + s / 2], [cx, cy + s]];
  const left = [[cx, cy - h + s], [cx - s, cy - h + s / 2], [cx - s, cy + s / 2], [cx, cy + s]];
  const o = opts.opacity != null ? ` opacity="${opts.opacity}"` : "";
  const st = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.strokeWidth || 3}"` : "";
  return `<polygon points="${P(left)}" fill="${cols[2]}"${o}${st}/>` +
         `<polygon points="${P(right)}" fill="${cols[1]}"${o}${st}/>` +
         `<polygon points="${P(t)}" fill="${cols[0]}"${o}${st}/>`;
}

/** flat iso slab (thin box) */
const slab = (cx, cy, s, h, cols, opts) => isoBox(cx, cy, s, h, cols, opts);

/** floating island platform: layered slabs + rocky underside + under-glow */
function island(cx, cy, s, accent) {
  let g = "";
  // under-glow
  g += `<ellipse cx="${cx}" cy="${cy + s * 0.75}" rx="${s * 1.25}" ry="${s * 0.42}" fill="${accent}" opacity="0.10" filter="url(#blur60)"/>`;
  // rocky inverted stack
  g += `<polygon points="${P([[cx, cy + s], [cx + s * 0.72, cy + s * 0.64], [cx, cy + s * 1.85], [cx - s * 0.72, cy + s * 0.64]])}" fill="#0d1322"/>`;
  g += `<polygon points="${P([[cx, cy + s], [cx + s * 0.72, cy + s * 0.64], [cx, cy + s * 1.55]])}" fill="#111830"/>`;
  // platform slabs
  g += slab(cx, cy + s * 0.16, s * 1.06, 46, ["#141b2e", "#0e1424", "#0a0f1c"]);
  g += slab(cx, cy, s, 34, ["#1b2440", "#141b30", "#0f1526"]);
  // accent rim on the top face
  g += `<polygon points="${P(diamond(cx, cy - 34, s))}" fill="none" stroke="${accent}" stroke-width="6" opacity="0.55"/>`;
  g += `<polygon points="${P(diamond(cx, cy - 34, s * 0.82))}" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.25"/>`;
  return g;
}

/** small floating rock shards around an island */
function shards(cx, cy, s, accent, n = 4) {
  let g = "";
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = s * (1.15 + rnd() * 0.5);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.45 + s * 0.3;
    const r = 18 + rnd() * 30;
    g += isoBox(x, y, r, r * (0.8 + rnd()), ["#1b2440", "#141b30", "#0f1526"]);
    if (rnd() > 0.5) g += `<circle cx="${x}" cy="${y - r * 2.2}" r="${4 + rnd() * 4}" fill="${accent}" opacity="0.7"/>`;
  }
  return g;
}

const glowLine = (x1, y1, x2, y2, color, w = 5, op = 0.85) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w * 3}" opacity="${op * 0.25}" stroke-linecap="round" filter="url(#blur12)"/>` +
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" opacity="${op}" stroke-linecap="round"/>`;

const glowDot = (x, y, r, color, op = 1) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="${color}" opacity="${0.22 * op}" filter="url(#blur12)"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`;

// ---------- scene 1: THE CHAIN (cyan) ----------
function sceneChain(cx, cy) {
  const C = "#22d3ee";
  let g = island(cx, cy, 760, C) + shards(cx, cy, 760, C);
  // chain of blocks rising left→right across the platform's visual center
  const steps = [
    [cx - 460, cy + 420, 120, 96],
    [cx - 200, cy + 330, 132, 118],
    [cx + 70, cy + 240, 146, 140],
    [cx + 350, cy + 140, 160, 165],
  ];
  // links first (behind blocks)
  for (let i = 0; i < steps.length - 1; i++) {
    const [x1, y1, , h1] = steps[i], [x2, y2, , h2] = steps[i + 1];
    g += glowLine(x1 + 60, y1 - h1 - 20, x2 - 60, y2 - h2 + 40, C, 7);
    g += glowDot((x1 + x2) / 2, (y1 - h1 + y2 - h2) / 2 + 10, 9, C);
  }
  steps.forEach(([x, y, s, h], i) => {
    g += isoBox(x, y, s, h, ["#173049", "#102337", "#0b1a2b"], { stroke: C, strokeWidth: 3.5 });
    // circuit traces + block number on the top face
    g += `<polyline points="${P([[x - s * 0.5, y - h + s * 0.5], [x, y - h + s * 0.26], [x + s * 0.5, y - h + s * 0.5]])}" fill="none" stroke="${C}" stroke-width="3" opacity="0.8"/>`;
    g += glowDot(x, y - h + s * 0.26, 6, C);
    g += `<text x="${x}" y="${y - h + s * 0.72}" font-family="ui-monospace,Menlo,monospace" font-size="${36 + i * 5}" fill="${C}" opacity="0.9" text-anchor="middle">#${i + 1}</text>`;
  });
  // genesis marker
  g += glowDot(cx - 460, cy + 420 - 96 - 60, 12, C);
  return g;
}

// ---------- scene 2: CONSENSUS (green) — validator farm ----------
function sceneConsensus(cx, cy) {
  const C = "#34d399";
  let g = island(cx, cy, 720, C) + shards(cx, cy, 720, C);
  // two rows of server racks
  const racks = [
    [-380, 90], [-190, 185], [20, 280],
    [-140, -60], [70, 35], [280, 130],
  ];
  racks.forEach(([dx, dy]) => {
    const x = cx + dx, y = cy + dy - 60;
    g += isoBox(x, y, 88, 300, ["#12281f", "#0d1f18", "#091712"], { stroke: "#1d4436", strokeWidth: 2 });
    for (let r = 0; r < 5; r++) {
      const ly = y - 60 - r * 48;
      g += `<line x1="${x + 12}" y1="${ly + 50}" x2="${x + 76}" y2="${ly + 18}" stroke="${C}" stroke-width="5" opacity="${0.35 + 0.13 * ((r + dx * 0.01) % 5 === 0 ? 2 : 1)}" stroke-linecap="round"/>`;
      g += `<circle cx="${x + 68}" cy="${ly + 16}" r="4.5" fill="${C}" opacity="0.95"/>`;
    }
  });
  // consensus beacon
  const bx = cx + 420, by = cy - 130;
  g += isoBox(bx, by, 70, 190, ["#12281f", "#0d1f18", "#091712"], { stroke: C, strokeWidth: 3 });
  g += glowLine(bx, by - 190, bx, by - 330, C, 6);
  g += glowDot(bx, by - 345, 16, C);
  [70, 120, 175].forEach((r, i) => {
    g += `<ellipse cx="${bx}" cy="${by - 345}" rx="${r * 1.9}" ry="${r * 0.75}" fill="none" stroke="${C}" stroke-width="3.5" opacity="${0.5 - i * 0.14}"/>`;
  });
  // network mesh to racks
  [[-380, 90], [20, 280], [280, 130]].forEach(([dx, dy]) => {
    g += glowLine(bx, by - 330, cx + dx, cy + dy - 360 + (dy > 100 ? 6 : 0), C, 2.5, 0.5);
  });
  return g;
}

// ---------- scene 3: SMART CONTRACTS (purple) ----------
function sceneContracts(cx, cy) {
  const C = "#8b5cf6";
  let g = island(cx, cy, 740, C) + shards(cx, cy, 740, C);
  // central monolith (the contract)
  const mx = cx + 40, my = cy + 60;
  g += isoBox(mx, my, 210, 520, ["#241a45", "#1a1233", "#120c24"], { stroke: C, strokeWidth: 4 });
  // glowing code brace on the right face
  g += `<text x="${mx + 105}" y="${my - 180}" font-family="ui-monospace,Menlo,monospace" font-size="150" fill="${C}" text-anchor="middle" opacity="0.95">{ }</text>`;
  // code lines on left face
  for (let i = 0; i < 6; i++) {
    const w = [120, 150, 90, 160, 110, 70][i];
    g += `<line x1="${mx - 180}" y1="${my - 380 + i * 56 + 90}" x2="${mx - 180 + w}" y2="${my - 380 + i * 56 + 90 + w / 2}" stroke="${C}" stroke-width="8" opacity="${0.35 + (i % 3) * 0.15}" stroke-linecap="round"/>`;
  }
  // function pylons around it
  const fns = ["create()", "get()", "update()", "delete()", "list()"];
  const spots = [[-520, 130], [-300, 260], [330, 270], [520, 120], [430, -60]];
  spots.forEach(([dx, dy], i) => {
    const x = cx + dx, y = cy + dy;
    g += isoBox(x, y, 92, 120 + (i % 2) * 36, ["#241a45", "#1a1233", "#120c24"], { stroke: "#3c2d6e", strokeWidth: 2.5 });
    g += `<text x="${x}" y="${y - 140 - (i % 2) * 36 + 8}" font-family="ui-monospace,Menlo,monospace" font-size="42" fill="#c4b5fd" text-anchor="middle">${fns[i]}</text>`;
    g += glowLine(x, y - 100 - (i % 2) * 36, mx + dx * -0.12, my - 320, C, 2.5, 0.45);
  });
  // orbiting gear ring
  g += `<ellipse cx="${mx}" cy="${my - 560}" rx="300" ry="110" fill="none" stroke="${C}" stroke-width="3" opacity="0.45" stroke-dasharray="26 20"/>`;
  g += glowDot(mx - 300, my - 560, 11, C);
  g += glowDot(mx + 260, my - 610, 8, "#c4b5fd");
  return g;
}

// ---------- scene 4: THE VAULT (amber) ----------
function sceneVault(cx, cy) {
  const C = "#f59e0b";
  let g = island(cx, cy, 700, C) + shards(cx, cy, 700, C);
  // vault block
  const vx = cx - 60, vy = cy + 40;
  g += isoBox(vx, vy, 250, 400, ["#2e2410", "#241b0b", "#191307"], { stroke: C, strokeWidth: 4 });
  // vault door (on right face)
  const dx = vx + 128, dyc = vy - 90 + 64;
  g += `<ellipse cx="${dx}" cy="${dyc}" rx="118" ry="132" fill="#0f0c05" stroke="${C}" stroke-width="7"/>`;
  g += `<ellipse cx="${dx}" cy="${dyc}" rx="78" ry="88" fill="none" stroke="${C}" stroke-width="4" opacity="0.8"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g += `<line x1="${dx + Math.cos(a) * 40}" y1="${dyc + Math.sin(a) * 46}" x2="${dx + Math.cos(a) * 74}" y2="${dyc + Math.sin(a) * 84}" stroke="${C}" stroke-width="7" stroke-linecap="round"/>`;
  }
  g += glowDot(dx, dyc, 14, C);
  // coin stacks
  const stacks = [[-480, 240, 5], [-350, 320, 8], [330, 300, 6], [470, 190, 4], [240, 380, 3]];
  stacks.forEach(([sx, sy, n]) => {
    for (let i = 0; i < n; i++) {
      const y = cy + sy - i * 26;
      g += `<ellipse cx="${cx + sx}" cy="${y + 10}" rx="62" ry="26" fill="#191307"/>`;
      g += `<ellipse cx="${cx + sx}" cy="${y}" rx="62" ry="26" fill="#3a2d12" stroke="${C}" stroke-width="3"/>`;
    }
    const topY = cy + sy - (n - 1) * 26;
    g += `<text x="${cx + sx}" y="${topY + 9}" font-family="ui-monospace,Menlo,monospace" font-size="30" fill="${C}" text-anchor="middle" opacity="0.95">₿</text>`;
  });
  // floating key
  const kx = cx + 60, ky = cy - 520;
  g += glowLine(kx - 90, ky, kx + 60, ky, C, 9);
  g += `<circle cx="${kx - 120}" cy="${ky}" r="34" fill="none" stroke="${C}" stroke-width="9"/>`;
  g += `<line x1="${kx + 20}" y1="${ky}" x2="${kx + 20}" y2="${ky + 26}" stroke="${C}" stroke-width="9" stroke-linecap="round"/>`;
  g += `<line x1="${kx + 52}" y1="${ky}" x2="${kx + 52}" y2="${ky + 34}" stroke="${C}" stroke-width="9" stroke-linecap="round"/>`;
  g += `<ellipse cx="${kx}" cy="${ky}" rx="200" ry="70" fill="${C}" opacity="0.07" filter="url(#blur60)"/>`;
  return g;
}

// ---------- scene 5: THE STUDIO (supabase green) — the product ----------
function sceneStudio(cx, cy) {
  const C = "#3ecf8e";
  let g = island(cx, cy, 780, C) + shards(cx, cy, 780, C);
  // database cylinders (stacked disks)
  [[-480, 300, 3], [-330, 430, 4]].forEach(([dx, dy, n]) => {
    const x = cx + dx;
    for (let i = 0; i < n; i++) {
      const y = cy + dy - i * 64;
      g += `<path d="M ${x - 95} ${y - 40} A 95 40 0 0 0 ${x + 95} ${y - 40} L ${x + 95} ${y} A 95 40 0 0 1 ${x - 95} ${y} Z" fill="#0e2a1e"/>`;
      g += `<ellipse cx="${x}" cy="${y - 40}" rx="95" ry="40" fill="#14402c" stroke="${C}" stroke-width="3"/>`;
    }
    g += glowDot(x, cy + dy - n * 64 - 30, 8, C);
  });
  // big dashboard screen (billboard) — pylons land near the platform center
  const sx = cx + 150, sy = cy + 150;
  g += `<rect x="${sx - 330}" y="${sy - 420}" width="660" height="420" rx="22" fill="#0c1220" stroke="${C}" stroke-width="5"/>`;
  // screen glow
  g += `<rect x="${sx - 330}" y="${sy - 420}" width="660" height="420" rx="22" fill="${C}" opacity="0.05"/>`;
  // sidebar
  g += `<rect x="${sx - 306}" y="${sy - 396}" width="140" height="372" rx="12" fill="#111a2c"/>`;
  for (let i = 0; i < 5; i++) {
    g += `<rect x="${sx - 288}" y="${sy - 368 + i * 52}" width="${i === 0 ? 104 : 84}" height="18" rx="9" fill="${i === 0 ? C : "#2a3550"}" opacity="${i === 0 ? 0.9 : 0.8}"/>`;
  }
  // stat cards
  for (let i = 0; i < 3; i++) {
    g += `<rect x="${sx - 140 + i * 152}" y="${sy - 384} " width="136" height="88" rx="10" fill="#111a2c" stroke="#233049" stroke-width="2"/>`;
    g += `<rect x="${sx - 124 + i * 152}" y="${sy - 366}" width="56" height="10" rx="5" fill="#2a3550"/>`;
    g += `<rect x="${sx - 124 + i * 152}" y="${sy - 344}" width="${34 + i * 14}" height="20" rx="6" fill="${C}" opacity="0.85"/>`;
  }
  // table rows
  for (let r = 0; r < 5; r++) {
    const y = sy - 264 + r * 46;
    g += `<rect x="${sx - 140}" y="${y}" width="428" height="34" rx="8" fill="${r % 2 ? "#0f1728" : "#131d31"}"/>`;
    g += `<rect x="${sx - 124}" y="${y + 10}" width="30" height="13" rx="6" fill="#31405f"/>`;
    g += `<rect x="${sx - 76}" y="${y + 10}" width="${150 + (r * 37) % 90}" height="13" rx="6" fill="#3d4d6e"/>`;
    g += `<circle cx="${sx + 258}" cy="${y + 17}" r="7" fill="${C}" opacity="${0.5 + (r % 3) * 0.2}"/>`;
  }
  // screen pylons
  g += `<line x1="${sx - 180}" y1="${sy}" x2="${sx - 180}" y2="${sy + 120}" stroke="#233049" stroke-width="16"/>`;
  g += `<line x1="${sx + 180}" y1="${sy}" x2="${sx + 180}" y2="${sy + 160}" stroke="#233049" stroke-width="16"/>`;
  // url pill above
  g += `<rect x="${sx - 190}" y="${sy - 540}" width="380" height="72" rx="36" fill="#0c1220" stroke="${C}" stroke-width="3.5"/>`;
  g += `<text x="${sx}" y="${sy - 492}" font-family="ui-monospace,Menlo,monospace" font-size="40" fill="${C}" text-anchor="middle">localhost:3000</text>`;
  g += glowDot(sx - 260, sy - 560, 8, C);
  g += glowDot(sx + 300, sy - 300, 10, "#22d3ee");
  // connection from databases to screen
  g += glowLine(cx - 330, cy + 430 - 4 * 64 - 40, sx - 200, sy - 120, C, 3, 0.5);
  g += glowLine(cx - 480, cy + 300 - 3 * 64 - 40, sx - 260, sy - 80, C, 2.5, 0.4);
  return g;
}

// ---------- bridges between scenes (light paths) ----------
function bridge(x1, y1, x2, y2, c1, c2) {
  const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 260;
  let g = `<path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" fill="none" stroke="url(#bridge${x1})" stroke-width="5" opacity="0.5" stroke-dasharray="4 30" stroke-linecap="round"/>`;
  g = `<defs><linearGradient id="bridge${x1}" x1="${x1}" y1="0" x2="${x2}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` + g;
  // packets along the path
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + i * 0.17;
    const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
    const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
    g += glowDot(px, py, 6, i % 2 ? c1 : c2, 0.8);
  }
  return g;
}

// ---------- assemble world ----------
const SCENES = [
  { name: "chain", x: 2000, y: 2350 },
  { name: "consensus", x: 3600, y: 1250 },
  { name: "contracts", x: 5200, y: 2350 },
  { name: "vault", x: 6800, y: 1200 },
  { name: "studio", x: 8300, y: 2400 },
];
const ACCENTS = ["#22d3ee", "#34d399", "#8b5cf6", "#f59e0b", "#3ecf8e"];

let world = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <filter id="blur12" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="blur60" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="60"/></filter>
</defs>
`;
// bridges behind everything
for (let i = 0; i < SCENES.length - 1; i++) {
  const a = SCENES[i], b = SCENES[i + 1];
  world += bridge(a.x + 500, a.y - 120, b.x - 500, b.y - 60, ACCENTS[i], ACCENTS[i + 1]);
}
world += sceneChain(SCENES[0].x, SCENES[0].y);
world += sceneConsensus(SCENES[1].x, SCENES[1].y);
world += sceneContracts(SCENES[2].x, SCENES[2].y);
world += sceneVault(SCENES[3].x, SCENES[3].y);
world += sceneStudio(SCENES[4].x, SCENES[4].y);
world += "</svg>";
fs.writeFileSync("world.svg", world);

// ---------- background ----------
let bg = `<svg width="${BGW}" height="${BGH}" viewBox="0 0 ${BGW} ${BGH}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="nebA" cx="30%" cy="30%" r="60%"><stop offset="0" stop-color="#1b1440" stop-opacity="0.9"/><stop offset="1" stop-color="#1b1440" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebB" cx="72%" cy="60%" r="55%"><stop offset="0" stop-color="#0b2b3a" stop-opacity="0.9"/><stop offset="1" stop-color="#0b2b3a" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebC" cx="55%" cy="20%" r="40%"><stop offset="0" stop-color="#251043" stop-opacity="0.7"/><stop offset="1" stop-color="#251043" stop-opacity="0"/></radialGradient>
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070f"/><stop offset="0.6" stop-color="#070b14"/><stop offset="1" stop-color="#0a0f1e"/></linearGradient>
</defs>
<rect width="${BGW}" height="${BGH}" fill="url(#base)"/>
<rect width="${BGW}" height="${BGH}" fill="url(#nebA)"/>
<rect width="${BGW}" height="${BGH}" fill="url(#nebB)"/>
<rect width="${BGW}" height="${BGH}" fill="url(#nebC)"/>
`;
// grid horizon (very subtle)
for (let i = 0; i < 20; i++) {
  bg += `<line x1="0" y1="${1100 + i * 38}" x2="${BGW}" y2="${1100 + i * 38}" stroke="#182236" stroke-width="1" opacity="${0.28 - i * 0.012}"/>`;
}
for (let i = 0; i <= 48; i++) {
  bg += `<line x1="${i * 100}" y1="1100" x2="${(i - 24) * 200 + BGW / 2}" y2="${BGH}" stroke="#182236" stroke-width="1" opacity="0.14"/>`;
}
// stars
seed = 424242;
for (let i = 0; i < 420; i++) {
  const x = rnd() * BGW, y = rnd() * BGH * 0.85, r = rnd() * 2.2 + 0.4;
  const c = ["#8b93ad", "#c4d4ff", "#22d3ee", "#8b5cf6", "#ffffff"][Math.floor(rnd() * 5)];
  bg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${c}" opacity="${(0.25 + rnd() * 0.65).toFixed(2)}"/>`;
}
// a few bigger glow stars
for (let i = 0; i < 14; i++) {
  const x = rnd() * BGW, y = rnd() * BGH * 0.7;
  const c = i % 2 ? "#22d3ee" : "#8b5cf6";
  bg += `<circle cx="${x}" cy="${y}" r="7" fill="${c}" opacity="0.16"/><circle cx="${x}" cy="${y}" r="2.4" fill="${c}" opacity="0.9"/>`;
}
bg += "</svg>";
fs.writeFileSync("bg.svg", bg);

fs.writeFileSync("scenes.json", JSON.stringify({ scenes: SCENES, accents: ACCENTS }, null, 2));
console.log("world.svg, bg.svg, scenes.json written");
