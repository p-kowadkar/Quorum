'use strict';
// Quorum — Discord voice-call channel (Phase B1).
// Incident → brain → agents speak the debate in the voice channel + caption in the text channel.
// Approval: the approver can type in the text channel or speak in the voice channel.
const express = require('express');
const { Events } = require('discord.js');
const config = require('./src/config');
const brain = require('./src/brain');
const discord = require('./src/discord');

let roomClosed = false;
let server = null;
let shuttingDown = false;

// Deterministic emotion read (swappable Valence boundary) — mirrors the n8n adapter.
function readEmotion(text) {
  const t = String(text || '').toLowerCase();
  const hesitant = /(\buh+\b|\bum+\b|i guess|i think|maybe|not sure|don't know|dunno|hold on|wait|hmm+|unsure|nervous|worried)/.test(t);
  const confident = /(\byes\b|\byeah\b|\byep\b|ship it|do it|go ahead|approve|approved|confirm|send it|let's go|absolutely)/.test(t);
  if (hesitant) return { valence: -0.5, arousal: 0.7, label: 'stressed' };
  if (confident) return { valence: 0.5, arousal: 0.25, label: 'calm' };
  return { valence: 0.0, arousal: 0.3, label: 'neutral' };
}

async function fireActuators(actions) {
  for (const a of actions || []) {
    if (a.type === 'rollback') await discord.sendCaption('orchestrator', '🟢 Rollback shipped — store recovering. (stub)');
    else if (a.type === 'jira_stub') await discord.sendCaption('pm', 'Ticket QUO-142 created, assigned to you.');
    else if (a.type === 'create_issue') await discord.sendCaption('coder', `Filed issue: ${(a.params && a.params.title) || 'incident'}. (wire GitHub API here)`);
  }
}

async function handleApproval(text) {
  if (roomClosed) return;
  const res = await brain.message(text, readEmotion(text));
  await discord.renderTurns(res.turns);
  if (res.status === 'acting') {
    roomClosed = true;
    await fireActuators(res.actions);
    await discord.sendCaption('orchestrator', 'Mitigated. Closing the room.');
    await discord.leaveVoice();
  }
}

const CANNED_INCIDENT = {
  service: 'checkout-service',
  error_type: 'CheckoutServiceTimeoutError',
  message: 'Payment gateway did not respond in time',
  stack_frames: [{ file: 'server/index.js', line: 142, function: 'processPayment' }],
};

async function main() {
  await discord.login();
  await discord.joinVoice();
  discord.listenForApprovals(handleApproval);

  // B1 approval: listen for the approver typing in the text channel.
  discord.clients.orchestrator.on(Events.MessageCreate, async (msg) => {
    try {
      if (msg.author.bot || msg.channelId !== config.textChannelId) return;
      if (config.approverIds.length && !config.approverIds.includes(msg.author.id)) return;
      await handleApproval(msg.content);
    } catch (e) { console.error('[approval]', e); }
  });

  // Incident intake: NightOwl / n8n / curl POSTs the error here (or {} to use the canned demo incident).
  const app = express();
  app.use(express.json());
  app.get('/', (_req, res) => res.json({ ok: true, service: 'quorum-discord' }));
  app.post('/incident', async (req, res) => {
    try {
      const payload = req.body && Object.keys(req.body).length ? req.body : CANNED_INCIDENT;
      const out = await brain.event(payload);
      res.json({ ok: true, status: out.status });
      await discord.renderTurns(out.turns); // play after responding so the HTTP caller isn't blocked
    } catch (e) { console.error('[incident]', e); res.status(500).json({ ok: false, error: String(e) }); }
  });
  server = app.listen(config.port, () => console.log(`[discord] incident intake on :${config.port} (POST /incident)`));
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[discord] shutting down (${signal})`);
  if (server) server.close();
  await discord.leaveVoice();
  discord.destroyClients();
  process.exit(0);
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

main().catch((e) => { console.error('fatal', e); process.exit(1); });
