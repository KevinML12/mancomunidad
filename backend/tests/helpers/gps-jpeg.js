// Minimal synthetic JPEG with GPS EXIF for parser and HTTP flow tests.
export function gpsJpeg() {
  const tiff = Buffer.alloc(128);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8825, 10); tiff.writeUInt16LE(4, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18);
  tiff.writeUInt16LE(4, 26);
  for (const [i, tag, type, count, value] of [[0,1,2,2,78],[1,2,5,3,80],[2,3,2,2,87],[3,4,5,3,104]]) {
    const at = 28 + i * 12;
    tiff.writeUInt16LE(tag, at); tiff.writeUInt16LE(type, at + 2); tiff.writeUInt32LE(count, at + 4); tiff.writeUInt32LE(value, at + 8);
  }
  tiff.write('N\0', 78, 'ascii'); tiff.write('W\0', 87, 'ascii');
  for (const [at, numerator] of [[80,15],[88,40],[96,20],[104,91],[112,12],[120,50]]) {
    tiff.writeUInt32LE(numerator, at); tiff.writeUInt32LE(1, at + 4);
  }
  const payload = Buffer.concat([Buffer.from('Exif\0\0'), tiff]);
  const marker = Buffer.alloc(4); marker.writeUInt16BE(0xffe1, 0); marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([Buffer.from([255,216]), marker, payload, Buffer.from([255,217])]);
}
