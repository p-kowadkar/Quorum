'use strict';
// ElevenLabs Speech to Text boundary for captured Discord approval audio.
const config = require('./config');

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;

async function transcribePcm(pcm) {
  if (!pcm || pcm.length < SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * 0.2) {
    return '';
  }

  const wav = wavFromPcm(pcm);
  const form = new FormData();
  form.set('model_id', config.elevenSttModel);
  form.set('file', new Blob([wav], { type: 'audio/wav' }), 'approval.wav');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': config.elevenKey },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${await res.text()}`);

  const body = await res.json();
  return String(body.text || '').trim();
}

function wavFromPcm(pcm) {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, 28);
  header.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

module.exports = { transcribePcm };
