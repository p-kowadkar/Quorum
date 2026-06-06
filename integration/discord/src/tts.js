'use strict';
// ElevenLabs TTS → a Node Readable stream of MP3, ready for @discordjs/voice.
const { Readable } = require('stream');
const config = require('./config');

// Maps the brain's agent delivery hint (emotion.{stability,style-label}) to ElevenLabs voice_settings.
const STYLE = { concerned: 0.65, calm: 0.30, methodical: 0.20, neutral: 0.30 };

async function synthesize(text, voiceId, emotion = {}) {
  const stability = typeof emotion.stability === 'number' ? emotion.stability : 0.5;
  const style = emotion.style && STYLE[emotion.style] != null ? STYLE[emotion.style] : 0.3;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': config.elevenKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: config.elevenModel,
      voice_settings: { stability, similarity_boost: 0.75, style, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  return Readable.fromWeb(res.body); // web ReadableStream -> Node stream (Node 18+)
}

module.exports = { synthesize };
