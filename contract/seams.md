# Quorum — The Contract (four seams)

> **SHARED FILE. Edit jointly, never alone.** Everything downstream decouples once these shapes are frozen. The integration track (n8n / Telegram / voice / actuators) and the brain track (blackboard / agents / director) both build against exactly this.

## Ground rules

1. **n8n never decides who speaks; the brain never touches a webhook or an API key.**
2. The brain is stateful per session — an in-memory dict keyed by `session_id`.
3. Each brain response returns **the batch of turns to play until the next point where it needs the human, or it is done.** n8n plays the batch, then waits for a reply only when `status == awaiting_approval`.
4. **The only field n8n branches on is `status`.**

### Status values (lowercase strings, exactly these)

| status | meaning | n8n does |
|---|---|---|
| `triaging` | room opening, hypothesis forming | play turns |
| `debating` | Coder/Critic exchanging | play turns |
| `awaiting_approval` | room is asking the human | play turns, then **wait** for a voice note |
| `acting` | approved — actuators should fire | play turns, **fire `actions[]`** |
| `mitigated` | actuators done, room closed | play closing turn, flip store green |

---

## Seam 1 — event in  (n8n → brain)

`POST /session/event` — opens a session (or advances it on a system event).

```jsonc
{
  "session_id": null,                 // null opens a new session; the brain returns the id
  "source": "nightowl",               // nightowl | github | jira | manual
  "event_type": "error",              // error | actuators_done
  "payload": {
    "service": "checkout-service",
    "error_type": "CheckoutServiceTimeoutError",
    "message": "Payment gateway did not respond in time",
    "stack_frames": [
      { "file": "server/index.js", "line": 142, "function": "processPayment" }
    ]
  }
}
```

- `event_type: "error"` → opens the room, runs triage + debate, ends at `awaiting_approval`.
- `event_type: "actuators_done"` → sent by n8n **after** actuators fire; the brain transitions `acting → mitigated` and returns the closing turn. (This is how `mitigated` is reached — the brain owns the transition, n8n reports the fact. See [§ The mitigated handshake](#the-mitigated-handshake).)

### ⚠️ n8n owns the NightOwl → Seam 1 remap

NightOwl does **not** emit this flat shape. It POSTs a nested Sentry-style envelope. **n8n must map it** into the `payload` above before calling the brain:

| Brain `payload` field | NightOwl source field |
|---|---|
| `service` | `context.service` (or `tags.service`) |
| `error_type` | `exception.type` |
| `message` | `message` (top-level) |
| `stack_frames[].file` | `exception.stacktrace.frames[].filename` |
| `stack_frames[].line` | `exception.stacktrace.frames[].lineno` |
| `stack_frames[].function` | `exception.stacktrace.frames[].function` |

The brain only ever sees the clean shape; it never parses the raw envelope.

---

## Seam 2 — message in  (n8n → brain)

`POST /session/message` — the human's transcribed reply, carrying the emotion read off their voice.

```jsonc
{
  "session_id": "inc_001",
  "from": "user",
  "text": "skip the analysis, what's the fix?",
  "emotion": { "valence": -0.3, "arousal": 0.7, "label": "stressed" },
  "is_interrupt": true
}
```

- `from` is the wire field name; the brain reads it as `sender` (Pydantic alias, `populate_by_name=True`).
- `emotion` here is the **human** shape — see [§ Two emotions, never crossed](#two-emotions-never-crossed).

---

## Seam 3 — turns out  (brain → n8n)

The response to **both** calls above.

```jsonc
{
  "session_id": "inc_001",
  "status": "debating",
  "turns": [
    {
      "agent": "critic",                                  // orchestrator | rootcause | coder | critic | pm
      "text": "Hold on — that retry hammers a gateway that's already down.",
      "voice_id": "voice_critic",
      "delivery": { "stability": 0.30, "style": 0.65 },   // ElevenLabs voice settings — NOT human emotion
      "interrupts": true
    }
  ],
  "actions": []
}
```

- `delivery` is the **agent** shape — see below. n8n maps it straight to ElevenLabs `voice_settings`.
- n8n renders each turn as a text bubble **and** a voice note (rendered with `voice_id` + `delivery`), sent **in strict turn order**.

---

## Seam 4 — actions out  (inside the Seam 3 response)

Populated **only on the transition into `acting`** — never re-emitted on a later read of the same session.

```jsonc
"actions": [
  { "type": "rollback",     "params": {} },
  { "type": "create_issue", "params": { "title": "Checkout gateway timeout", "body": "..." } },
  { "type": "jira_stub",    "params": {} }
]
```

**Idempotency:** the brain clears `actions` after emitting them, so a stray follow-up message while `status == acting` returns `turns: [], actions: []`. n8n should *also* dedupe by `session_id + action.type` as defence in depth — actuators must never double-fire (no duplicate rollback, no duplicate GitHub issue).

---

## Two emotions, never crossed

Two different concepts; the names disambiguate them so n8n never feeds one where the other belongs.

| Concept | Field | Shape | Direction | Used by |
|---|---|---|---|---|
| **Human emotion** | `emotion` (Seam 2 in), `human_emotion` (blackboard) | `{ valence: -1..1, arousal: 0..1, label }` | inbound | the approval gate |
| **Agent delivery** | `delivery` (Seam 3 Turn) | `{ stability: 0..1, style: 0..1 }` | outbound | ElevenLabs `voice_settings` |

**The approval gate:** on a human approval, if `arousal > 0.6 AND valence < 0` → the room **holds** ("you don't sound sure, want me to hold?"). Otherwise it proceeds to `acting`. Coarse by design — even label-only emotion (mapped through a small lookup) satisfies it.

---

## The mitigated handshake

```
awaiting_approval --(human approves, sounds sure)--> acting   [brain emits actions[]]
        n8n fires actions[]
        n8n POST /session/event { session_id, event_type: "actuators_done" }
acting --(actuators_done)--> mitigated                        [brain emits closing turn]
        n8n flips NightOwl green, closes the room
```

The brain owns every status transition, including `acting → mitigated`. n8n's job is only to fire the actuators and report back.

---

## Endpoints summary

| Method | Path | Seam | Body | Returns |
|---|---|---|---|---|
| `POST` | `/session/event` | 1 | event (error \| actuators_done) | Seam 3 (+ Seam 4 when acting) |
| `POST` | `/session/message` | 2 | human message + emotion | Seam 3 (+ Seam 4 when acting) |
| `GET` | `/` | — | — | `{ "ok": true }` health check |

Build the whole integration loop against `brain/mock_app.py`, then swap the two n8n HTTP-node URLs to the real brain. **Only the URL changes.**
