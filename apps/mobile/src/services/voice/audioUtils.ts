// apps/mobile/src/services/voice/audioUtils.ts

import { Buffer } from "buffer";

// Gemini defaults: 24kHz for output, often 16kHz for input
export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export const writeWavHeader = (
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number,
) => {
  const buffer = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size

  return buffer;
};

export const addWavHeaderToBase64 = (
  pcmBase64: string,
  sampleRate: number = OUTPUT_SAMPLE_RATE,
): string => {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const header = writeWavHeader(sampleRate, 1, 16, pcmBuffer.length);
  const total = Buffer.concat([header, pcmBuffer]);
  return total.toString("base64");
};

export const stripWavHeaderFromBase64 = (wavBase64: string): string => {
  const buffer = Buffer.from(wavBase64, "base64");
  // WAV header is usually 44 bytes.
  // We can verify "RIFF" and "WAVE" but for simplicity we assume 44 bytes if recorded via expo-av with known settings.
  if (buffer.length <= 44) return "";
  return buffer.slice(44).toString("base64");
};
