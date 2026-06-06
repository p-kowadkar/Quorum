'use strict';
// Discord plane: one bot client per agent (distinct text identities), the Orchestrator
// client joins the voice channel and plays every turn's audio sequentially (distinct ElevenLabs voices).
const { Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, entersState, StreamType, VoiceConnectionStatus,
} = require('@discordjs/voice');
const config = require('./config');
const tts = require('./tts');

const clients = {}; // agent -> discord.js Client
let player = null;
let connection = null;

async function login() {
  for (const agent of config.AGENTS) {
    const token = config.TOKENS[agent];
    if (!token) { console.warn(`[discord] no token for ${agent} — skipping`); continue; }
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // privileged — enable in the Dev Portal for the listener bot
      ],
    });
    await client.login(token);
    await new Promise((resolve) => client.once(Events.ClientReady, resolve));
    clients[agent] = client;
    console.log(`[discord] ${agent} ready as ${client.user.tag}`);
  }
}

async function joinVoice() {
  const orch = clients.orchestrator;
  if (!orch) throw new Error('orchestrator client required to join voice');
  const guild = await orch.guilds.fetch(config.guildId);
  connection = joinVoiceChannel({
    channelId: config.voiceChannelId,
    guildId: config.guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false, // keep mic open so Phase B2 can receive the human
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  player = createAudioPlayer();
  connection.subscribe(player);
  console.log('[discord] joined voice channel');
}

async function sendCaption(agent, text) {
  const client = clients[agent] || clients.orchestrator;
  const channel = await client.channels.fetch(config.textChannelId);
  await channel.send(`**${agent.toUpperCase()}**: ${text}`);
}

async function speak(turn) {
  const voiceId = config.VOICES[turn.agent] || config.VOICES.orchestrator;
  const stream = await tts.synthesize(turn.text, voiceId, turn.emotion || {});
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
  player.play(resource);
  await entersState(player, AudioPlayerStatus.Playing, 10_000).catch(() => {});
  await entersState(player, AudioPlayerStatus.Idle, 5 * 60_000); // wait until this clip finishes
}

// One turn = its bot posts the caption + the room speaks it (in order).
async function renderTurns(turns) {
  for (const turn of turns || []) {
    await sendCaption(turn.agent, turn.text);
    await speak(turn);
  }
}

module.exports = { login, joinVoice, sendCaption, renderTurns, clients, getConnection: () => connection };
