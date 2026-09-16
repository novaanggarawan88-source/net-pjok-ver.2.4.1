import fs from 'node:fs';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size, isMaskable = false) {
  // Emerald / Teal theme: #059669
  // Scanlines: 1 filter byte (0) + 4 bytes per pixel (RGBA)
  const scanlineLen = 1 + size * 4;
  const rawData = Buffer.alloc(scanlineLen * size);

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const safeMargin = isMaskable ? size * 0.15 : size * 0.05;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Outer background
      let r = 5, g = 150, b = 105, a = 255; // Emerald 600

      // Rounded rect or circle background
      if (isMaskable) {
        // Maskable fills entire canvas safely with primary color
        r = 5; g = 150; b = 105; a = 255;
      } else {
        // Rounded squircle
        const dx = Math.max(Math.abs(x - cx) - (size / 2 - radius), 0);
        const dy = Math.max(Math.abs(y - cy) - (size / 2 - radius), 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) {
          a = 0; // Transparent outside
        }
      }

      if (a > 0) {
        // Draw athletic runner / trophy emblem in white
        const relX = (x - cx) / (size / 2 - safeMargin);
        const relY = (y - cy) / (size / 2 - safeMargin);
        const emblemDist = Math.sqrt(relX * relX + relY * relY);

        // Center badge circle
        if (emblemDist < 0.65 && emblemDist > 0.58) {
          r = 255; g = 255; b = 255; // White ring
        } else if (emblemDist <= 0.58) {
          // Inner contrast
          r = 4; g = 120; b = 87; // Darker emerald inside
          
          // Torch / Star in center
          if (Math.abs(relX) < 0.15 && Math.abs(relY) < 0.35) {
            r = 255; g = 255; b = 255;
          } else if (Math.abs(relY) < 0.15 && Math.abs(relX) < 0.35) {
            r = 255; g = 255; b = 255;
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: 6 = RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync('public/pwa-192x192.png', generatePng(192, false));
fs.writeFileSync('public/pwa-512x512.png', generatePng(512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePng(512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePng(180, false));

console.log('Successfully generated PWA icons in public/');
