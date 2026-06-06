# Contract — the four seams

**Linchpin. Edit jointly, never alone.** Both halves build against these shapes.

- n8n branches only on `status`.
- The brain is stateful per `session_id` (in-memory dict, fine for the demo).
- Each call returns the batch of turns to play until the next point where it needs
  the human (`status = awaiting_approval`) or is done.

## Seam 1 — event in (n8n → brain) · `POST /session/event`

```jsonc
{
  "session_id": null,                 // null starts a new session; brain returns the id
  "source": "nightowl",               // nightowl | github | jira | manual
  "event_type": "error",
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

## Seam 2 — message in (n8n → brain) · `POST /session/message`

```jsonc
{
  "session_id": "inc_001",
  "from": "user",
  "text": "skip the analysis, what's the fix?",
  "emotion": { "valence": -0.3, "arousal": 0.7, "label": "stressed" },
  "is_interrupt": true
}
```

## Seam 3 — turns out (brain → n8n) — response to both calls above

```jsonc
{
  "session_id": "inc_001",
  "status": "debating",               // triaging|debating|awaiting_approval|acting|mitigated
  "turns": [
    {
      "agent": "critic",
      "text": "Hold on -- that retry hammers a gateway that's already down.",
      "voice_id": "el_critic",
      "emotion": { "stability": 0.30, "style": "concerned" },
      "interrupts": true
    }
  ],
  "actions": []
}
```

## Seam 4 — actions out (lives inside Seam 3 when the room decides to act)

```jsonc
"actions": [
  { "type": "rollback",     "params": {} },
  { "type": "create_issue", "params": { "title": "Checkout gateway timeout", "body": "..." } },
  { "type": "jira_stub",    "params": {} }
]
```

## status values

`triaging` → `debating` → `awaiting_approval` → `acting` → `mitigated`

The only field the n8n side branches on is `status`. While `awaiting_approval`, ask
the human and wait. While `acting`, fire `actions`. When `mitigated`, close out.
