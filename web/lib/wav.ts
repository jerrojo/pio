export const maxAudioBytes = 800044;
export function validateWav(data: Buffer): void {
  // The capture worklet creates a canonical, mono PCM16 / 16k WAV. Reject other layouts.
  if (
    data.length < 6444 ||
    data.length > maxAudioBytes ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WAVE" ||
    data.toString("ascii", 12, 16) !== "fmt " ||
    data.readUInt32LE(16) !== 16 ||
    data.readUInt16LE(20) !== 1 ||
    data.readUInt16LE(22) !== 1 ||
    data.readUInt32LE(24) !== 16000 ||
    data.readUInt32LE(28) !== 32000 ||
    data.readUInt16LE(32) !== 2 ||
    data.readUInt16LE(34) !== 16 ||
    data.toString("ascii", 36, 40) !== "data" ||
    data.readUInt32LE(40) !== data.length - 44 ||
    data.readUInt32LE(4) !== data.length - 8 ||
    (data.length - 44) % 2 !== 0
  )
    throw new Error("invalid-audio");
}
export function encodeWav(
  chunks: Float32Array[],
  sampleRate: number,
): ArrayBuffer {
  const length = chunks.reduce((n, c) => n + c.length, 0),
    samples = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    samples.set(c, offset);
    offset += c.length;
  }
  const ratio = sampleRate / 16000,
    size = Math.floor(length / ratio),
    data = new ArrayBuffer(44 + size * 2),
    v = new DataView(data);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, data.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, "data");
  v.setUint32(40, size * 2, true);
  for (let i = 0; i < size; i++) {
    let sum = 0,
      count = 0;
    for (
      let j = Math.floor(i * ratio);
      j < Math.min(length, Math.floor((i + 1) * ratio));
      j++
    ) {
      sum += samples[j];
      count++;
    }
    const s = Math.max(-1, Math.min(1, sum / (count || 1)));
    v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return data;
}
