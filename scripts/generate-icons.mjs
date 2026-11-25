import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Crisp SVG Icon (used as favicon and reference)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0b1120"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="55%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="20" y="20" width="472" height="472" rx="96" fill="none" stroke="#334155" stroke-width="4" opacity="0.6"/>
  <!-- Left bracket < -->
  <path d="M196 154 L106 256 L196 358" fill="none" stroke="url(#accent)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Right bracket > -->
  <path d="M316 154 L406 256 L316 358" fill="none" stroke="url(#accent)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Center slash / -->
  <path d="M282 138 L230 374" fill="none" stroke="url(#glow)" stroke-width="28" stroke-linecap="round"/>
  <!-- Subtle algorithm nodes -->
  <circle cx="282" cy="138" r="18" fill="#34d399"/>
  <circle cx="230" cy="374" r="18" fill="#38bdf8"/>
</svg>
`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

// Minimal PNG encoder using Node zlib
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function renderIconPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    const ny = (y + 0.5) / size; // 0..1
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size; // 0..1
      const grad = (nx + ny) * 0.5;

      // Base dark slate gradient (#0f172a -> #1e293b -> #0b1120)
      let r = 15 + Math.sin(grad * Math.PI) * 18;
      let g = 23 + Math.sin(grad * Math.PI) * 20;
      let b = 42 + Math.sin(grad * Math.PI) * 24;

      // Subtle inner radial highlight
      const dc = Math.hypot(nx - 0.5, ny - 0.45);
      const highlight = Math.max(0, 1 - dc * 1.9) * 16;
      r += highlight * 0.4;
      g += highlight * 0.8;
      b += highlight * 1.3;

      // Brackets geometry in normalized 0..1 coords (matching 512 SVG)
      const strokeW = 34 / 512 / 2;
      const slashW = 28 / 512 / 2;
      const aa = 1.2 / size;

      const dL1 = distToSegment(nx, ny, 196 / 512, 154 / 512, 106 / 512, 256 / 512);
      const dL2 = distToSegment(nx, ny, 106 / 512, 256 / 512, 196 / 512, 358 / 512);
      const dR1 = distToSegment(nx, ny, 316 / 512, 154 / 512, 406 / 512, 256 / 512);
      const dR2 = distToSegment(nx, ny, 406 / 512, 256 / 512, 316 / 512, 358 / 512);
      const dBracket = Math.min(dL1, dL2, dR1, dR2);

      const dSlash = distToSegment(nx, ny, 282 / 512, 138 / 512, 230 / 512, 374 / 512);
      const dDot1 = Math.hypot(nx - 282 / 512, ny - 138 / 512) - 18 / 512;
      const dDot2 = Math.hypot(nx - 230 / 512, ny - 374 / 512) - 18 / 512;

      // Blend bracket (#38bdf8 -> #818cf8)
      const aBracket = Math.max(0, Math.min(1, (strokeW - dBracket) / aa + 0.5));
      if (aBracket > 0) {
        const br = 56 + grad * (129 - 56);
        const bg = 189 + grad * (140 - 189);
        const bb = 248 + grad * (248 - 248);
        r = r * (1 - aBracket) + br * aBracket;
        g = g * (1 - aBracket) + bg * aBracket;
        b = b * (1 - aBracket) + bb * aBracket;
      }

      // Blend slash (#34d399 -> #06b6d4)
      const aSlash = Math.max(0, Math.min(1, (slashW - dSlash) / aa + 0.5));
      if (aSlash > 0) {
        const sr = 52 + ny * (6 - 52);
        const sg = 211 + ny * (182 - 211);
        const sb = 153 + ny * (212 - 153);
        r = r * (1 - aSlash) + sr * aSlash;
        g = g * (1 - aSlash) + sg * aSlash;
        b = b * (1 - aSlash) + sb * aSlash;
      }

      // Top node dot (#34d399)
      const aDot1 = Math.max(0, Math.min(1, -dDot1 / aa + 0.5));
      if (aDot1 > 0) {
        r = r * (1 - aDot1) + 52 * aDot1;
        g = g * (1 - aDot1) + 211 * aDot1;
        b = b * (1 - aDot1) + 153 * aDot1;
      }

      // Bottom node dot (#38bdf8)
      const aDot2 = Math.max(0, Math.min(1, -dDot2 / aa + 0.5));
      if (aDot2 > 0) {
        r = r * (1 - aDot2) + 56 * aDot2;
        g = g * (1 - aDot2) + 189 * aDot2;
        b = b * (1 - aDot2) + 248 * aDot2;
      }

      const off = rowStart + 1 + x * 4;
      raw[off] = Math.max(0, Math.min(255, Math.round(r)));
      raw[off + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[off + 2] = Math.max(0, Math.min(255, Math.round(b)));
      raw[off + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, size] of targets) {
  fs.writeFileSync(path.join(iconsDir, name), renderIconPng(size));
}
console.log('[generate-icons] Generated SVG and PNG app icons in public/icons/');
