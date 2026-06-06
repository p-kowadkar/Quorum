'use strict';
// Discord plane: one bot client per agent (distinct text identities), the Orchestrator
// client joins the voice channel and plays every turn's audio sequentially (distinct ElevenLabs voices).
const { ChannelType, Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, EndBehaviorType, entersState, StreamType, VoiceConnectionStatus,
} = require('@discordjs/voice');
const prism = require('prism-media');
const config = require('./config');
const stt = require('./stt');
const tts = require('./tts');

const clients = {}; // agent -> discord.js Client
const players = {}; // agent -> AudioPlayer
const connections = {}; // agent -> VoiceConnection
const activeSpeakers = new Set();

async function login() {
  for (const agent of config.AGENTS) {
    const token = config.TOKENS[agent];
    if (!token) { console.warn(`[discord] no token for ${agent} — skipping`); continue; }
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ];
    if (agent === 'orchestrator') intents.push(GatewayIntentBits.MessageContent);
    const client = new Client({
      intents,
    });
    const ready = new Promise((resolve) => client.once(Events.ClientReady, resolve));
    await client.login(token);
    if (!client.isReady()) await ready;
    clients[agent] = client;
    console.log(`[discord] ${agent} ready as ${client.user.tag}`);
  }
}

async function joinVoice() {
  for (const agent of config.AGENTS) {
    const client = clients[agent];
    if (!client) continue;

    const guild = await client.guilds.fetch(config.guildId);
    const channel = await client.channels.fetch(config.voiceChannelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      throw new Error(`voice channel not found or not a guild voice channel: ${config.voiceChannelId}`);
    }

    const connection = joinVoiceChannel({
      channelId: config.voiceChannelId,
      guildId: config.guildId,
      adapterCreator: guild.voiceAdapterCreator,
      group: agent,
      selfDeaf: agent !== 'orchestrator', // Orchestrator stays open for future voice receive.
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    const player = createAudioPlayer();
    connection.subscribe(player);
    connections[agent] = connection;
    players[agent] = player;
    console.log(`[discord] ${agent} joined voice channel`);
  }
}

async function sendCaption(agent, text) {
  const client = clients[agent] || clients.orchestrator;
  const channel = await client.channels.fetch(config.textChannelId);
  await channel.send(`**${agent.toUpperCase()}**: ${text}`);
}

async function speak(turn) {
  const player = players[turn.agent] || players.orchestrator;
  if (!player) throw new Error(`no voice player for ${turn.agent}`);
  const voiceId = config.VOICES[turn.agent] || config.VOICES.orchestrator;
  const stream = await tts.synthesize(turn.text, voiceId, turn.emotion || {});
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
  player.play(resource);
  await entersState(player, AudioPlayerStatus.Playing, 10_000).catch(() => {});
  await entersState(player, AudioPlayerStatus.Idle, 5 * 60_000); // wait until this clip finishes
}

async function leaveVoice() {
  activeSpeakers.clear();
  for (const agent of config.AGENTS) {
    const connection = connections[agent];
    if (!connection) continue;
    connection.destroy();
    delete connections[agent];
    delete players[agent];
    console.log(`[discord] ${agent} left voice channel`);
  }
}

function destroyClients() {
  for (const agent of config.AGENTS) {
    const client = clients[agent];
    if (!client) continue;
    client.destroy();
    delete clients[agent];
  }
}

function listenForApprovals(onTranscript) {
  const connection = connections.orchestrator;
  if (!connection) throw new Error('orchestrator voice connection required for approvals');

  connection.receiver.speaking.on('start', (userId) => {
    if (config.approverIds.length && !config.approverIds.includes(userId)) return;
    if (activeSpeakers.has(userId)) return;
    activeSpeakers.add(userId);

    const opus = connection.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1_200 },
    });
    const decoder = new prism.opus.Decoder({ rate: 48_000, channels: 2, frameSize: 960 });
    const chunks = [];

    decoder.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    decoder.once('end', async () => {
      activeSpeakers.delete(userId);
      try {
        const text = await stt.transcribePcm(Buffer.concat(chunks));
        if (!text) return;
        console.log(`[approval voice] ${userId}: ${text}`);
        await sendCaption('orchestrator', `Heard approval voice: "${text}"`);
        if (!isApprovalCommand(text)) {
          console.log(`[approval voice] ignored non-command: ${text}`);
          return;
        }
        await onTranscript(text);
      } catch (e) {
        console.error('[approval voice]', e);
        await sendCaption('orchestrator', 'Voice approval capture failed. Type approval in the text channel as fallback.');
      }
    });
    decoder.once('error', (e) => {
      activeSpeakers.delete(userId);
      console.error('[approval decode]', e);
    });
    opus.once('error', (e) => {
      activeSpeakers.delete(userId);
      console.error('[approval receive]', e);
    });
    opus.pipe(decoder);
  });

  console.log('[discord] voice approval listener ready');
}

function isApprovalCommand(text) {
  const t = String(text || '').toLowerCase();
  return /(\byes\b|\byeah\b|\byep\b|ship it|do it|go ahead|approve|approved|confirm|send it|let's go|absolutely|\buh+\b|\bum+\b|i guess|i think|maybe|not sure|don't know|dunno|hold on|\bwait\b|hmm+|unsure|nervous|worried)/.test(t);
}

// One turn = its bot posts the caption + the room speaks it (in order).
async function renderTurns(turns) {
  for (const turn of turns || []) {
    await sendCaption(turn.agent, turn.text);
    await speak(turn);
  }
}

module.exports = { login, joinVoice, leaveVoice, destroyClients, listenForApprovals, sendCaption, renderTurns, clients, getConnection: () => connections.orchestrator };
