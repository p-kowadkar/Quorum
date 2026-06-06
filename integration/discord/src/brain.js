'use strict';
// Client for the shared FastAPI brain — the same four seams Telegram/n8n use.
const config = require('./config');

async function post(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.brainSecret) headers['X-Webhook-Secret'] = config.brainSecret;
  const res = await fetch(`${config.brainUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`brain ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Seam 1
const event = (payload) =>
  post('/session/event', { session_id: null, source: 'discord', event_type: 'error', payload });

// Seam 2
const message = (text, emotion) =>
  post('/session/message', {
    session_id: config.sessionId,
    from: 'user',
    text,
    emotion,
    is_interrupt: false,
  });

module.exports = { event, message };
