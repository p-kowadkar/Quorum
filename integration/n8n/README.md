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
- **#4 is built** as a second importable workflow — see [Issue #4](#issue-4--approval-loop-quorummessageworkflowjson) below.
- **Cast/agent keys** (`orchestrator|rootcause|coder|critic|pm`) come from the brain; to add a specialist, add a `VOICES` entry, a Switch rule, and a `Send: …` node bound to its bot.

---

## Issue #4 — Approval loop (`quorum.message.workflow.json`)

Closes the loop: you reply to the room **by voice note**, the brain reads your emotion, and on a steady "ship it" the room acts.

```
Inbound: voice note (Telegram Trigger, restricted to you + voice only → no bot echo)
  → Download voice → Transcribe (ElevenLabs STT) → Read emotion (Valence adapter, Code heuristic)
  → POST /session/message  ──┬──→ render reply turns (Split→Resolve→Reply TTS→Route→5 Send bots)
                             └──→ if status==acting → Split actions → Route by action:
                                   rollback → canned msg · create_issue → GitHub issue · jira_stub → canned PM line
```

### Import & configure (second workflow)
Import `quorum.message.workflow.json` (separate from the #3 render workflow). Then:

1. **Inbound: voice note** (Telegram Trigger) → assign a **listener bot** credential (use the **Orchestrator** bot; it's send-only in #3 so no conflict). Set:
   - `Chat IDs` = your group id (the negative `-…` number from `getUpdates`)
   - `User IDs` = **your** numeric Telegram user id (from `getUpdates`) — *this is the echo-loop guard; the bots never post under your id, so they can't re-trigger.* Comma-separate multiple human approvers.
2. **Download voice** + **Transcribe (ElevenLabs STT)** → assign the **ElevenLabs** credential to the STT node. If the node shows a required **Model**, pick **Scribe v1**. (STT output transcript is read as `$json.text`; the emotion node also falls back to `transcription`/`transcript`.)
3. **Read emotion (Valence adapter)** — Code heuristic maps the transcript → `{valence, arousal, label}` (hesitation words → stressed → the gate holds; confident words → calm → it ships). This is the **swappable Valence boundary**: replace the Code with a Valence HTTP call when its I/O is confirmed.
4. **POST /session/message** → set the brain URL (`https://<ngrok>/session/message`) + `X-Webhook-Secret` if the brain uses one. `session_id` is hardcoded `inc_001` (single-incident demo).
5. **Render nodes** (Resolve agent identity, Reply TTS, 5 Send bots) → configure **exactly like #3** (CHAT_ID + voices in Resolve; ElevenLabs cred on Reply TTS; each Send bot its credential).
6. **Actuators:**
   - **create_issue (GitHub)** → assign a **GitHub** credential + set `owner`/`repository` (e.g. a demo repo). Title/body come from the action.
   - **rollback** + **jira_stub** → assign a Telegram bot credential + set the chat id (these are canned-message stubs; `rollback` is where a real NightOwl mitigate endpoint would go).

### Test (against the mock)
With #3's opening event played (room at `awaiting_approval`), **record a voice note in the group**:
- *"uh… I guess, ship it"* (unsure) → STT → emotion gate → **Orchestrator holds**.
- *"yes, ship it"* (steady) → status `acting` → **a real GitHub issue is created** + the jira-stub + rollback messages post.

> **Echo-loop:** the listener-bot trigger is restricted by **your user id** (primary guard) plus an `is_bot != true` filter (defense-in-depth). Keep `User IDs` set.
> **Known brain gaps handled here:** the brain doesn't emit `mitigated` and can re-emit actions — n8n owns the closing message and should fire actuators once per approval (don't send a second "ship it" in the same incident).
