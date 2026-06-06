# n8n — Quorum render pipeline (Issue #3, native multi-bot)

Catches an incident, calls the brain, and renders every turn to your Telegram group as a **voice note with the agent's line as caption** — where **each agent posts as its own bot** (its own name + avatar). Built on **native n8n nodes**: the official ElevenLabs node for TTS and the native Telegram node per bot. The only HTTP Request is the call to our own brain API (no dedicated node exists for it).

```
NightOwl Webhook → Map to Seam 1 → POST /session/event (HTTP, our brain) → Split Out turns
  → Resolve agent identity   (Code: agent → {voiceId, chatId})
  → ElevenLabs TTS           (official node; voice + delivery settings → audio binary "data")
  → Route by agent (Switch)  → Send: Orchestrator / RootCause / Coder / Critic / PM
                               (native Telegram sendAudio, one per bot credential, caption = the line)
```

**Why a Switch + 5 send nodes:** a native Telegram node binds one credential, so multi-bot = route each turn to the node bound to that agent's bot. TTS runs once (voice is per-item), so it isn't duplicated.

## Prerequisites

1. **Install the official ElevenLabs node** — `@elevenlabs/n8n-nodes-elevenlabs` (Settings → Community nodes → Install). ✅ *(done)*
2. **ElevenLabs API credential** — create one (`ElevenLabs API`) with your key.
3. **5 Telegram bot credentials** — one per agent. In `@BotFather`, `/newbot` ×5; create a `Telegram API` credential per token. Suggested bots:

   | Bot | Agent key | Assign to node |
   |---|---|---|
   | Quorum Orchestrator | `orchestrator` | Send: Orchestrator |
   | Quorum RootCause | `rootcause` | Send: RootCause |
   | Quorum Coder | `coder` | Send: Coder |
   | Quorum Critic | `critic` | Send: Critic |
   | Quorum PM | `pm` | Send: PM |

4. **Add all 5 bots to the same group**; post `/start@each_bot` once. Grab the **group chat ID** (`-100…`) via `https://api.telegram.org/bot<ANY_TOKEN>/getUpdates`.
5. **5 ElevenLabs voice IDs** (Voices page, or the ElevenLabs node's *Voice → From list*).

## Import & configure

Import `quorum.workflow.json` (Workflows → ⋮ → Import from File). Then:

1. **POST /session/event** → set URL to your tunnel `https://<ngrok>/session/event`. (The `ngrok-skip-browser-warning` header is already set.) If the brain runs with `BRAIN_WEBHOOK_SECRET` set, also set the pre-added `X-Webhook-Secret` header value to match — it's harmless when the brain has no secret.

2. **Resolve agent identity** (Code node) → fill the map at the top:
   ```js
   const CHAT_ID = '-1001234567890';        // your group chat id
   const VOICES = {
     orchestrator: '<EL voice id>',
     rootcause:    '<EL voice id>',
     coder:        '<EL voice id>',
     critic:       '<EL voice id>',
     pm:           '<EL voice id>',
   };
   ```

3. **ElevenLabs TTS** → assign your **ElevenLabs API** credential. Voice, text, and `voiceSettings` are expression-driven per turn — the **Resolve agent identity** node maps the brain's `turn.emotion` (`{stability, style: "concerned"|"calm"|"methodical"}`) into ElevenLabs `voice_settings` floats (style label → number), defaulting to calm when a turn has no emotion. Model defaults to `eleven_multilingual_v2`.

4. **Send: \<Agent\>** (×5) → assign **each node its matching bot credential** (the node names tell you which: *Send: Critic* → the Critic bot, etc.). Chat ID and caption are already wired.

> Keep real tokens/keys in n8n only. The repo file stays placeholder-only (`EL_VOICE_*`, `YOUR_*`) so nothing leaks.

## Test

NightOwl Webhook → copy **Test URL** → click **Execute workflow** → POST the sample payload:

```powershell
$payload = @{
  message   = "Payment gateway did not respond in time"
  exception = @{ type = "CheckoutServiceTimeoutError"; stacktrace = @{ frames = @( @{ filename = "server/index.js"; lineno = 142; "function" = "processPayment" } ) } }
  context   = @{ service = "checkout-service" }
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Uri "PASTE_TEST_URL_HERE" -Method Post -ContentType "application/json" -Body $payload
```

✅ **Expected:** 5 voice notes in turn order (Orchestrator → RootCause → Coder → Critic → Orchestrator), **each from a different bot**, each captioned with the agent's line, each in that agent's distinct voice.

> `/webhook-test/quorum-event` while "listening for test event"; `/webhook/quorum-event` once **Published**.

## Notes & next

- **All native** except the brain call (custom FastAPI → HTTP is correct). ElevenLabs = official node; Telegram = native; (OpenRouter/Firecrawl native too, for later steps).
- **#4 extends this** with a **Telegram Trigger** → **ElevenLabs Speech-to-Text** → Valence → `POST /session/message`, plus actuators (native **GitHub** node for `create_issue`, native Telegram for the `jira_stub` line, HTTP to NightOwl's mitigate endpoint for `rollback`).
- **Cast/agent keys** (`orchestrator|rootcause|coder|critic|pm`) come from the brain; to add a specialist, add a `VOICES` entry, a Switch rule, and a `Send: …` node bound to its bot.
