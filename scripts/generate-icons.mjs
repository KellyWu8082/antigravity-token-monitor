import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, "build");
const PNG_PATH = path.join(BUILD_DIR, "icon.png");
const ICNS_PATH = path.join(BUILD_DIR, "icon.icns");
const ICO_PATH = path.join(BUILD_DIR, "icon.ico");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function renderIconPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const half = size / 2;

  // Coordinates for stylized "A" + telemetry pulse bar inside squircle
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type None

    for (let x = 0; x < size; x += 1) {
      const nx = (x - half + 0.5) / half; // -1..1
      const ny = (y - half + 0.5) / half; // -1..1

      // macOS squircle-like rounded card inset (padding ~9%)
      const cardDist = sdRoundedBox(nx, ny, 0.84, 0.84, 0.36);
      const cardAlpha = 1 - smoothstep(-0.006, 0.006, cardDist);

      if (cardAlpha <= 0.001) {
        continue;
      }

      // Deep obsidian base with aurora radial glows
      let r = 9;
      let g = 14;
      let b = 29;

      // Top-left indigo/violet glow
      const d1 = Math.hypot(nx + 0.42, ny + 0.42);
      const g1 = Math.exp(-d1 * d1 * 2.1);
      r += 96 * g1;
      g += 86 * g1;
      b += 225 * g1;

      // Bottom-right cyan glow
      const d2 = Math.hypot(nx - 0.48, ny - 0.44);
      const g2 = Math.exp(-d2 * d2 * 2.3);
      r += 24 * g2;
      g += 196 * g2;
      b += 224 * g2;

      // Subtle inner rim highlight
      const rim = smoothstep(-0.045, -0.008, cardDist) * cardAlpha;
      r += 58 * rim;
      g += 72 * rim;
      b += 110 * rim;

      // Central geometric "A" chevron + telemetry pulse bars
      const leftLeg = sdSegment(nx, ny, -0.34, 0.34, 0.0, -0.44);
      const rightLeg = sdSegment(nx, ny, 0.0, -0.44, 0.34, 0.34);
      const crossBar = sdSegment(nx, ny, -0.19, 0.08, 0.19, 0.08);
      const glyphDist = Math.min(leftLeg, rightLeg, crossBar) - 0.068;
      const glyphAlpha = 1 - smoothstep(-0.007, 0.007, glyphDist);

      // Telemetry 3-bar accent under the A
      const bar1 = sdRoundedBox(nx + 0.18, ny - 0.36, 0.055, 0.09, 0.025);
      const bar2 = sdRoundedBox(nx, ny - 0.32, 0.055, 0.13, 0.025);
      const bar3 = sdRoundedBox(nx - 0.18, ny - 0.38, 0.055, 0.07, 0.025);
      const barDist = Math.min(bar1, bar2, bar3);
      const barAlpha = 1 - smoothstep(-0.006, 0.006, barDist);

      // Soft halo around glyph
      const halo = Math.exp(-Math.max(0, glyphDist) * 14) * 0.25;
      r += 60 * halo;
      g += 180 * halo;
      b += 255 * halo;

      // Composite crisp white/cyan gradient glyph
      if (glyphAlpha > 0) {
        const gradT = clamp((nx + ny + 1) * 0.5, 0, 1);
        const gr = 248 - 40 * gradT;
        const gg = 250 - 8 * gradT;
        const gb = 255;
        r = r * (1 - glyphAlpha) + gr * glyphAlpha;
        g = g * (1 - glyphAlpha) + gg * glyphAlpha;
        b = b * (1 - glyphAlpha) + gb * glyphAlpha;
      }

      // Composite cyan/emerald telemetry bars
      if (barAlpha > 0) {
        const br = 34;
        const bg = 211;
        const bb = 238;
        r = r * (1 - barAlpha) + br * barAlpha;
        g = g * (1 - barAlpha) + bg * barAlpha;
        b = b * (1 - barAlpha) + bb * barAlpha;
      }

      const idx = rowStart + 1 + x * 4;
      raw[idx] = Math.round(clamp(r, 0, 255));
      raw[idx + 1] = Math.round(clamp(g, 0, 255));
      raw[idx + 2] = Math.round(clamp(b, 0, 255));
      raw[idx + 3] = Math.round(clamp(cardAlpha * 255, 0, 255));
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function generateMacIcns() {
  const iconsetDir = path.join(BUILD_DIR, "icon.iconset");
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];

  for (const [px, filename] of sizes) {
    execFileSync(
      "sips",
      ["-z", String(px), String(px), PNG_PATH, "--out", path.join(iconsetDir, filename)],
      { stdio: "ignore" },
    );
  }

  execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", ICNS_PATH], {
    stdio: "inherit",
  });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

function generateWindowsIco() {
  // Multi-resolution PNG-in-ICO (supported natively on Windows Vista/7/10/11)
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = sizes.map((size) => ({
    size,
    data: renderIconPng(size),
  }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.size >= 256 ? 0 : img.size;
    entry[1] = img.size >= 256 ? 0 : img.size;
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += img.data.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...images.map((img) => img.data),
  ]);
  fs.writeFileSync(ICO_PATH, icoBuffer);
}

fs.mkdirSync(BUILD_DIR, { recursive: true });
const pngBuffer = renderIconPng(1024);
fs.writeFileSync(PNG_PATH, pngBuffer);
console.log(`[icons] Generated ${PNG_PATH}`);

generateWindowsIco();
console.log(`[icons] Generated ${ICO_PATH}`);

if (process.platform === "darwin") {
  generateMacIcns();
  console.log(`[icons] Generated ${ICNS_PATH}`);
}
