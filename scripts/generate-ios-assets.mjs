import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';

const outputs = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
  ['public/icons/maskable-512.png', 512]
];

for (const [file, size] of outputs) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, createIcon(size));
  console.log(`generated ${join(process.cwd(), file)}`);
}

function createIcon(size) {
  const channels = 4;
  const raw = Buffer.alloc((size * channels + 1) * size);
  const logoStart = Math.floor(size * 0.24);
  const logoEnd = Math.floor(size * 0.76);
  const stem = Math.max(8, Math.floor(size * 0.075));
  const top = Math.floor(size * 0.31);
  const bottom = Math.floor(size * 0.71);
  const radius = Math.floor(size * 0.17);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * channels + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * channels;
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      const rounded = Math.min(dx, dy) < radius && distanceToCorner(x, y, size, radius) > radius;
      const t = (x + y) / (size * 2);
      raw[offset] = rounded ? 18 : Math.round(255 - 8 * t);
      raw[offset + 1] = rounded ? 8 : Math.round(106 - 43 * t);
      raw[offset + 2] = rounded ? 17 : Math.round(42 + 105 * t);
      raw[offset + 3] = 255;

      if (isLogoPixel(x, y, logoStart, logoEnd, top, bottom, stem)) {
        raw[offset] = 255;
        raw[offset + 1] = 248;
        raw[offset + 2] = 236;
      }
    }
  }

  return Buffer.concat([
    pngSignature(),
    chunk('IHDR', ihdr(size, size)),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function isLogoPixel(x, y, start, end, top, bottom, stem) {
  const leftStem = x >= start && x <= start + stem && y >= top && y <= bottom;
  const rightStem = x >= end - stem && x <= end && y >= top && y <= bottom;
  const center = x >= start + stem && x <= end - stem && y >= top && y <= top + stem;
  const diagonalWidth = stem + 2;
  const leftDiag = Math.abs((x - (start + stem)) - ((y - top) * 0.55)) <= diagonalWidth && y >= top && y <= bottom;
  const rightDiag = Math.abs((end - stem - x) - ((y - top) * 0.55)) <= diagonalWidth && y >= top && y <= bottom;
  return leftStem || rightStem || center || leftDiag || rightDiag;
}

function distanceToCorner(x, y, size, radius) {
  const cx = x < radius ? radius : size - 1 - radius;
  const cy = y < radius ? radius : size - 1 - radius;
  return Math.hypot(x - cx, y - cy);
}

function pngSignature() {
  return Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcValue, 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
