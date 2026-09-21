import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import zlib from 'zlib'

function createPNG(width, height) {
  const pixels = Buffer.alloc(width * height * 4)

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const i = (y * width + x) * 4
    const srcA = a / 255
    const dstA = pixels[i + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA > 0) {
      pixels[i] = Math.round((r * srcA + pixels[i] * dstA * (1 - srcA)) / outA)
      pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA)
      pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA)
      pixels[i + 3] = Math.round(outA * 255)
    }
  }

  function fillCircle(cx, cy, radius, r, g, b) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(x, y, r, g, b)
      }
    }
  }

  function fillRect(x1, y1, w, h, r, g, b) {
    for (let y = y1; y < y1 + h; y++)
      for (let x = x1; x < x1 + w; x++) setPixel(x, y, r, g, b)
  }

  // Round rect background
  const radius = Math.round(width * 0.18)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let inside = true
      const checks = [
        [radius, radius, 0, 0], [width - 1 - radius, radius, 1, 0],
        [radius, height - 1 - radius, 0, 1], [width - 1 - radius, height - 1 - radius, 1, 1]
      ]
      for (const [cx, cy, px, py] of checks) {
        const dx = px ? Math.max(0, x - cx) : Math.max(0, cx - x)
        const dy = py ? Math.max(0, y - cy) : Math.max(0, cy - y)
        if (dx > 0 && dy > 0 && Math.sqrt(dx * dx + dy * dy) > radius) inside = false
      }
      if (inside) setPixel(x, y, 108, 99, 255)
    }

  // White card
  const pad = Math.round(width * 0.18)
  const cw = width - pad * 2
  const ch = Math.round(height * 0.52)
  const cy = Math.round((height - ch) / 2)
  const cr = Math.round(width * 0.08)
  for (let y = cy; y < cy + ch; y++)
    for (let x = pad; x < pad + cw; x++) {
      let inside = true
      const checks = [
        [pad + cr, cy + cr, 0, 0], [pad + cw - 1 - cr, cy + cr, 1, 0],
        [pad + cr, cy + ch - 1 - cr, 0, 1], [pad + cw - 1 - cr, cy + ch - 1 - cr, 1, 1]
      ]
      for (const [ccx, ccy, px, py] of checks) {
        const dx = px ? Math.max(0, x - ccx) : Math.max(0, ccx - x)
        const dy = py ? Math.max(0, y - ccy) : Math.max(0, ccy - y)
        if (dx > 0 && dy > 0 && Math.sqrt(dx * dx + dy * dy) > cr) inside = false
      }
      if (inside) setPixel(x, y, 255, 255, 255)
    }

  // гд symbol
  const mid = Math.round(width / 2)
  const sw = Math.max(2, Math.round(width * 0.025))
  const topY = cy + Math.round(ch * 0.15)
  // Two horizontal bars
  fillRect(mid - Math.round(cw * 0.22), topY, Math.round(cw * 0.44), sw, 255, 107, 107)
  fillRect(mid - Math.round(cw * 0.16), topY + Math.round(ch * 0.12), Math.round(cw * 0.32), sw, 255, 107, 107)
  // V shape
  for (let t = 0; t <= 1; t += 0.003) {
    const lx = Math.round(mid - cw * 0.2 * (1 - t))
    const rx = Math.round(mid + cw * 0.2 * (1 - t))
    const ty = Math.round(topY + ch * 0.28 + t * ch * 0.55)
    for (let d = -Math.round(sw / 2); d <= Math.round(sw / 2); d++) {
      setPixel(lx, ty + d, 255, 107, 107)
      setPixel(rx, ty + d, 255, 107, 107)
    }
  }

  // PNG encoding
  function crc32(buf) {
    let c = 0xffffffff
    const table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let v = n
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1
      table[n] = v
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6

  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const compressed = zlib.deflateSync(raw)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const outDir = join(process.cwd(), 'public')
const icon192 = createPNG(192, 192)
const icon512 = createPNG(512, 512)
writeFileSync(join(outDir, 'pwa-192x192.png'), icon192)
writeFileSync(join(outDir, 'pwa-512x512.png'), icon512)
console.log('Generated pwa-192x192.png (' + icon192.length + ' bytes)')
console.log('Generated pwa-512x512.png (' + icon512.length + ' bytes)')
