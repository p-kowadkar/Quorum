'use strict';
require('dotenv').config();

const AGENTS = ['orchestrator', 'rootcause', 'coder', 'critic', 'pm'];

const TOKENS = {
  orchestrator: process.env.DISCORD_ORCHESTRATOR_TOKEN,
  rootcause: process.env.DISCORD_ROOTCAUSE_TOKEN,
  coder: process.env.DISCORD_CODER_TOKEN,
  critic: process.env.DISCORD_CRITIC_TOKEN,
  pm: process.env.DISCORD_PM_TOKEN,
};

const VOICES = {
  orchestrator: process.env.EL_VOICE_ORCH,
  rootcause: process.env.EL_VOICE_ROOT,
  coder: process.env.EL_VOICE_CODER,
  critic: process.env.EL_VOICE_CRITIC,
  pm: process.env.EL_VOICE_PM,
};

module.exports = {
  AGENTS,
  TOKENS,
  VOICES,
  guildId: process.env.DISCORD_GUILD_ID,
  textChannelId: process.env.DISCORD_TEXT_CHANNEL_ID,
  voiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID,
  approverIds: (process.env.DISCORD_APPROVER_USER_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean),
  brainUrl: (process.env.BRAIN_URL || '').replace(/\/$/, ''),
  brainSecret: process.env.BRAIN_WEBHOOK_SECRET || '',
  elevenKey: process.env.ELEVENLABS_API_KEY,
  elevenModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
  port: parseInt(process.env.PORT || '8080', 10),
  sessionId: process.env.SESSION_ID || 'inc_001',
};
