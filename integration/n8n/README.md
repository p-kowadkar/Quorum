# n8n — Quorum render pipeline (Issue #3, multi-bot)

Catches an incident, calls the brain, and renders every turn to your Telegram group as a **text bubble + ElevenLabs voice note** — where **each agent posts as its own bot** (its own name + avatar in the group).

```
NightOwl Webhook → Map to Seam 1 → POST /session/event → Split Out turns
  → Resolve agent identity   (agent → {bot token, voice id, chat id})
  → Telegram text  (raw Bot API, per-agent token)
  → ElevenLabs TTS (per-agent voice)
  → Telegram voice (raw Bot API sendAudio, per-agent token)
```

**Multi-bot routing:** an n8n Telegram node binds one credential, so instead we call the Telegram Bot API directly via HTTP Request nodes and pick the **bot token per turn** from a single map in the **Resolve agent identity** node. One node holds all the secrets; the send nodes are generic.

Verified against n8n's real node schemas (multipart binary upload, JSON-body expressions, Code return shapes, webhook execution) — import-ready.

---

## Prerequisites (gather first)

1. **5 Telegram bots** — in `@BotFather`, `/newbot` ×5. Suggested names/avatars:

   | Bot | Agent key |
   |---|---|
   | Quorum Orchestrator | `orchestrator` |
   | Quorum RootCause | `rootcause` |
   | Quorum Coder | `coder` |
   | Quorum Critic | `critic` |
   | Quorum PM | `pm` |

2. **Add all 5 bots to the same group.** Post `/start@each_bot` once so each registers an update.
3. **Group chat ID** (`-100…`) — `https://api.telegram.org/bot<ANY_TOKEN>/getUpdates` → `result[].message.chat.id`.
4. **ElevenLabs**: one API key + **5 voice IDs** (Voices page, or `GET https://api.elevenlabs.io/v1/voices`).

## Import

n8n cloud → **Workflows → ⋮ → Import from File** → `quorum.workflow.json`. Imports inactive.

## Configure (3 places)

1. **Brain URL** — open **POST /session/event** → set URL to your tunnel `https://<ngrok>/session/event`. (The `ngrok-skip-browser-warning` header is already set.)

2. **Resolve agent identity** (the one node that holds everything) — open it and fill the map at the top of the code:
   ```js
   const CHAT_ID = '-1001234567890';            // your group chat id
   const BOTS = {
     orchestrator: { token: '<orch bot token>',   voice: '<EL voice id>' },
     rootcause:    { token: '<rootcause token>',   voice: '<EL voice id>' },
     coder:        { token: '<coder token>',       voice: '<EL voice id>' },
     critic:       { token: '<critic token>',      voice: '<EL voice id>' },
     pm:           { token: '<pm token>',          voice: '<EL voice id>' },
   };
   ```

3. **ElevenLabs key** — open **ElevenLabs TTS** → set the `xi-api-key` header value. (Model is `eleven_multilingual_v2`; swap to `eleven_turbo_v2_5` for lower latency.)

> **Keep real tokens in your n8n copy only.** The repo file stays as placeholders (`BOT_TOKEN_*`, `YOUR_*`) so nothing leaks. Don't paste secrets into the working-tree file.

## Test (text first, then voice)

1. Double-click **NightOwl Webhook** → copy **Test URL** → click **Execute workflow** → POST the sample payload below to the Test URL.

```powershell
$payload = @{
  message   = "Payment gateway did not respond in time"
  exception = @{ type = "CheckoutServiceTimeoutError"; stacktrace = @{ frames = @( @{ filename = "server/index.js"; lineno = 142; "function" = "processPayment" } ) } }
  context   = @{ service = "checkout-service" }
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "PASTE_TEST_URL_HERE" -Method Post -ContentType "application/json" -Body $payload
```

✅ **Expected:** 5 text bubbles, each from a **different bot** (Orchestrator → RootCause → Coder → Critic → Orchestrator), then 5 voice notes in matching order with that agent's voice. If the **ElevenLabs TTS** node errors before you've set the key/voices, the text bubbles already prove the multi-bot loop.

> Use `/webhook-test/quorum-event` while "listening for test event"; `/webhook/quorum-event` once **Published**.

## Notes & next

- **Security:** the ElevenLabs key sits in a node header for import simplicity; switch it to a *Header Auth* credential for anything shared.
- **#4 extends this** with a Telegram Trigger → transcribe → Valence → `POST /session/message`, plus actuators on `status == acting`.
- **Cast/agent keys** come from the brain (`orchestrator|rootcause|coder|critic|pm`); to add/rename a specialist, add one line to the `BOTS` map.
