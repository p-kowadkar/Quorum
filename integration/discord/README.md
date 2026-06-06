# Quorum — Discord voice-call channel

A standalone Node service (NOT n8n) that mirrors the Quorum room into Discord: the agents **join a voice channel and speak the debate** (distinct ElevenLabs voices), post captions as **distinct bots** in the text channel, and act on your approval. It calls the **same brain** as the Telegram path (`/session/event`, `/session/message`) — Telegram and Discord are two independent channels over one core.

> Telegram (the n8n workflows in `../n8n/`) is the **guaranteed** demo. This Discord voice path is the ambitious stretch — real-time audio is fragile; keep text-channel approval as the fallback.

## Current behavior
- All 5 persona bots join the configured voice channel.
- Each agent posts its own caption in the text channel.
- Each agent speaks its own turn in order using its configured ElevenLabs voice.
- Approved users can approve by speaking in the voice channel or by typing in the text channel.
- Voice approval uses Discord voice receive -> ElevenLabs STT -> emotion heuristic -> `/session/message`.
- After accepted approval, the service posts the actuator captions and all bots leave the voice channel.

## Setup

```bash
cd integration/discord
npm install            # requires Node >=22.12.0
cp .env.example .env   # then fill it in (see below)
npm start
```

### `.env` (never commit — gitignored)
- **`DISCORD_*_TOKEN`** — one per agent. ⚠️ **Regenerate any token ever pasted anywhere** (Dev Portal → app → Bot → Reset Token).
- **`DISCORD_GUILD_ID` / `DISCORD_TEXT_CHANNEL_ID` / `DISCORD_VOICE_CHANNEL_ID`** — right-click → Copy ID (enable Developer Mode).
- **`DISCORD_APPROVER_USER_IDS`** — comma-separated **numeric** user IDs (not usernames like `dt_07`). Right-click your name → Copy User ID.
- **`BRAIN_URL`** — your tunnel (same brain Telegram uses). **`BRAIN_WEBHOOK_SECRET`** if set.
- **`ELEVENLABS_API_KEY`** + **`EL_VOICE_*`** — same 5 voice IDs as Telegram.
- **`ELEVENLABS_STT_MODEL`** — optional, defaults to `scribe_v2`.

### Discord portal prerequisites (per bot)
- Invite all 5 apps to the server.
- All 5 bots need **View Channels**, **Connect**, and **Speak** for the voice channel.
- All 5 bots need **Send Messages** in the text channel so captions use each bot identity.
- The Orchestrator needs **Read Messages** in the text channel and **Use Voice Activity** in the voice channel.
- Enable the **MESSAGE CONTENT** privileged intent for the Orchestrator bot (Dev Portal → Bot → Privileged Gateway Intents) — required to read your typed approval.

## Run the demo
1. Start the brain and expose it:
   ```bash
   cd brain
   python3 -m uvicorn mock_app:app --host 127.0.0.1 --port 8000
   ngrok http 8000
   ```
2. Put the ngrok URL in `integration/discord/.env` as `BRAIN_URL`.
3. Start Discord:
   ```bash
   cd integration/discord
   npm install
   npm start
   ```
4. `npm start` -> all 5 bots log in and join the voice channel. **Join the voice channel yourself** to listen.
5. Trigger an incident: `curl -X POST http://localhost:8080/incident -H "Content-Type: application/json" -d "{}"` (uses the canned checkout-timeout incident; or POST a real NightOwl payload). The room debates aloud + captions appear.
6. Approve by voice or text:
   - hesitant: `uh, I guess ship it` -> the room holds.
   - confident: `yes, approve the rollback` -> the room acts, posts closeout captions, and all bots leave voice.

## Layout
```
integration/discord/
├── index.js         # boot + incident intake + typed/voice approval
├── src/
│   ├── config.js    # env
│   ├── brain.js     # /session/event + /session/message client
│   ├── stt.js       # ElevenLabs STT for approval voice
│   ├── tts.js       # ElevenLabs TTS to Node stream
│   └── discord.js   # 5 clients, voice join, sequential playback, captions, voice receive
├── package.json
├── package-lock.json
└── .env.example
```
