import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, "..", "public", "media");

const covers = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#003B40"/>
      <stop offset="100%" stop-color="#0D1517"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g1)"/>
  <g stroke="#008C96" stroke-opacity="0.5" fill="none" stroke-width="2">
    <path d="M0 640 Q360 480 600 620 T1200 560"/>
    <path d="M0 560 Q360 400 600 540 T1200 480" stroke-opacity="0.35" stroke-width="1.5"/>
  </g>
  <text x="72" y="140" fill="#FFB000" font-size="26" font-family="system-ui,sans-serif" letter-spacing="0.35em">VOICE</text>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0D1517"/>
      <stop offset="100%" stop-color="#003B40"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g2)"/>
  <g stroke="#FFB000" stroke-opacity="0.35" fill="none" stroke-width="2">
    <circle cx="960" cy="200" r="120"/>
    <circle cx="960" cy="200" r="200" stroke-opacity="0.2"/>
    <circle cx="960" cy="200" r="280" stroke-opacity="0.12"/>
  </g>
  <text x="72" y="140" fill="#FFB000" font-size="26" font-family="system-ui,sans-serif" letter-spacing="0.35em">CAMPAIGN</text>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs>
    <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0D1517"/>
      <stop offset="100%" stop-color="#142326"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g3)"/>
  <g stroke="#008C96" stroke-opacity="0.4" fill="none" stroke-width="2.5">
    <path d="M80 720 L200 620 L320 660 L440 560 L560 600 L680 480 L800 520 L920 400 L1040 440 L1120 320"/>
  </g>
  <text x="72" y="140" fill="#FFB000" font-size="26" font-family="system-ui,sans-serif" letter-spacing="0.35em">IDENTITY</text>
</svg>`,
];

for (let i = 0; i < covers.length; i++) {
  const out = path.join(mediaDir, `insight-cover-${i + 1}.jpg`);
  await sharp(Buffer.from(covers[i], "utf8"))
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out);
  console.log("wrote", out);
}

const sigSvg = path.join(mediaDir, "signature.svg");
const sigPng = path.join(mediaDir, "signature.png");
await sharp(sigSvg).resize({ width: 400 }).png({ compressionLevel: 9 }).toFile(sigPng);
console.log("wrote", sigPng);
