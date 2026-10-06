// ZIP32 STORE, fixed timestamps, UTF-8 names. No compression and no source rewrites.
const table = Uint32Array.from({length: 256}, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff; for (const byte of bytes) c = table[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zipStore(plan) {
  const encoder = new TextEncoder();
  const entries = plan.paths.map(path => ({name: encoder.encode(path), bytes: plan.files.get(path)}));
  if (entries.length > 65535) throw new Error('ZIP32 entry count exceeded');
  const localSize = entries.reduce((n, e) => n + 30 + e.name.length + e.bytes.length, 0);
  const centralSize = entries.reduce((n, e) => n + 46 + e.name.length, 0);
  if (localSize + centralSize + 22 >= 0xffffffff || entries.some(e => e.name.length > 65535)) throw new Error('ZIP32 size exceeded');
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  const u16 = (p, n) => view.setUint16(p, n, true);
  const u32 = (p, n) => view.setUint32(p, n, true);
  let cursor = 0; let central = localSize;
  for (const {name, bytes} of entries) {
    const crc = crc32(bytes);
    u32(cursor, 0x04034b50); u16(cursor + 4, 20); u16(cursor + 6, 0x800); u16(cursor + 12, 33);
    u32(cursor + 14, crc); u32(cursor + 18, bytes.length); u32(cursor + 22, bytes.length); u16(cursor + 26, name.length);
    output.set(name, cursor + 30); output.set(bytes, cursor + 30 + name.length);
    u32(central, 0x02014b50); u16(central + 4, 20); u16(central + 6, 20); u16(central + 8, 0x800); u16(central + 14, 33);
    u32(central + 16, crc); u32(central + 20, bytes.length); u32(central + 24, bytes.length); u16(central + 28, name.length); u32(central + 42, cursor);
    output.set(name, central + 46);
    cursor += 30 + name.length + bytes.length; central += 46 + name.length;
  }
  u32(central, 0x06054b50); u16(central + 8, entries.length); u16(central + 10, entries.length); u32(central + 12, centralSize); u32(central + 16, localSize);
  return output;
}
