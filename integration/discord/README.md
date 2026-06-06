# Quorum — Discord voice-call channel

A standalone Node service (NOT n8n) that mirrors the Quorum room into Discord: the agents **join a voice channel and speak the debate** (distinct ElevenLabs voices), post captions as **distinct bots** in the text channel, and act on your approval. It calls the **same brain** as the Telegram path (`/session/event`, `/session/message`) — Telegram and Discord are two independent channels over one core.

> Telegram (the n8n workflows in `../n8n/`) is the **guaranteed** demo. This Discord voice path is the ambitious stretch — real-time audio is fragile; keep text-channel approval as the fallback.

## Phases
- **B1 (this scaffold):** Orchestrator bot joins the voice channel and plays each turn's audio in order; all 5 bots post captions. **You approve by typing** in the text channel (`ship it` / `hold on`).
- **B2 (next, documented below):** the bot **hears you** — voice-receive → ElevenLabs STT → emotion → `/session/message`.

## Setup

```bash
cd integration/discord
npm install            # discord.js, @discordjs/voice, @discordjs/opus, ffmpeg-static, libsodium-wrappers, express, dotenv
cp .env.example .env   # then fill it in (see below)
npm start
```

### `.env` (never commit — gitignored)
- **`DISCORD_*_TOKEN`** — one per agent. ⚠️ **Regenerate any token ever pasted anywhere** (Dev Portal → app → Bot → Reset Token).
- **`DISCORD_GUILD_ID` / `DISCORD_TEXT_CHANNEL_ID` / `DISCORD_VOICE_CHANNEL_ID`** — right-click → Copy ID (enable Developer Mode).
- **`DISCORD_APPROVER_USER_IDS`** — comma-separated **numeric** user IDs (not usernames like `dt_07`). Right-click your name → Copy User ID.
- **`BRAIN_URL`** — your tunnel (same brain Telegram uses). **`BRAIN_WEBHOOK_SECRET`** if set.
- **`ELEVENLABS_API_KEY`** + **`EL_VOICE_*`** — same 5 voice IDs as Telegram.

### Discord portal prerequisites (per bot)
- Invite all 5 apps to the server; the Orchestrator (listener) needs **Read Messages / Send Messages** in the text channel and **Connect / Speak** in the voice channel.
- Enable the **MESSAGE CONTENT** privileged intent for the Orchestrator bot (Dev Portal → Bot → Privileged Gateway Intents) — required to read your typed approval.
- `ffmpeg` is needed to transcode ElevenLabs MP3 → Opus; `ffmpeg-static` is a dependency, but if playback fails, install system ffmpeg and ensure it's on `PATH`.

## Run the demo (B1)
1. `npm start` → bots log in, Orchestrator joins the voice channel. **Join the voice channel yourself** to listen.
2. Trigger an incident: `curl -X POST http://localhost:8080/incident -H "Content-Type: application/json" -d "{}"` (uses the canned checkout-timeout incident; or POST a real NightOwl payload). The room debates aloud + captions appear.
3. **Approve by typing** in the text channel: `uh, I guess ship it` → the room holds; `yes, ship it` → it acts (rollback / issue / jira stubs post).

## Phase B2 — hear the human (TODO)
Add `src/voiceReceive.js`:
- `connection.receiver.subscribe(approverUserId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 1200 } })` → one Opus stream per user (discord.js can't auto-mix multiple speakers).
- Decode Opus → PCM/WAV (`prism-media` `opus.Decoder`), buffer until end-of-speech, → ElevenLabs **Speech-to-Text** → transcript → `readEmotion()` → `brain.message()` → `discord.renderTurns()`.
- Gate strictly on `config.approverIds`. Pre-render/cache the opening debate audio for the live demo; keep text approval as the fallback if voice-receive flakes.

## Layout
```
integration/discord/
├── index.js         # boot + incident intake (Express) + B1 text approval
├── src/
│   ├── config.js    # env
│   ├── brain.js     # /session/event + /session/message client
│   ├── tts.js       # ElevenLabs TTS → Node stream
│   └── discord.js   # 5 clients, voice join, sequential playback, captions
├── package.json
└── .env.example
```
