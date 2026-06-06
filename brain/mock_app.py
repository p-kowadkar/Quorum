"""
Quorum — mock brain (contract stub).

Implements the four seams (see contract/seams.md) with canned, deterministic
turns so the integration track (n8n / Telegram / ElevenLabs / Valence / actuators)
can be built end-to-end before the real brain exists. Swap the URL later — nothing
else on the n8n side changes.

Run:
    pip install -r requirements.txt
    uvicorn mock_app:app --port 8000
Then tunnel it:
    cloudflared tunnel --url http://localhost:8000   # or: ngrok http 8000

This stub needs NO API keys.
"""
from __future__ import annotations

from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="Quorum mock brain", version="0.1.0")

# One bot/voice identity per agent (n8n maps these to real ElevenLabs voice_ids).
VOICES = {
    "orchestrator": "voice_orchestrator",
    "rootcause": "voice_rootcause",
    "coder": "voice_coder",
    "critic": "voice_critic",
    "pm": "voice_pm",
}

# Minimal per-session state so actions fire exactly once (idempotency, see contract).
SESSIONS: dict[str, dict] = {}


# ── Seam payload models ───────────────────────────────────────────────────────
class EventIn(BaseModel):
    session_id: Optional[str] = None
    source: str = "manual"
    event_type: str = "error"          # error | actuators_done
    payload: dict = Field(default_factory=dict)


class MessageIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    session_id: str
    sender: str = Field("user", alias="from")
    text: str = ""
    emotion: dict = Field(default_factory=dict)
    is_interrupt: bool = False


# ── Helpers ───────────────────────────────────────────────────────────────────
def turn(agent: str, text: str, *, emotion: dict | None = None,
         interrupts: bool = False) -> dict:
    """Build a Seam 3 turn. `emotion` carries the agent's delivery hints
    ({stability: float, style: label}); n8n maps it to ElevenLabs voice_settings."""
    return {
        "agent": agent,
        "text": text,
        "voice_id": VOICES[agent],
        "emotion": emotion or {},
        "interrupts": interrupts,
    }


def reply(session_id: str, status: str, turns: list[dict], actions: list[dict] | None = None) -> dict:
    return {
        "session_id": session_id,
        "status": status,
        "turns": turns,
        "actions": actions or [],
    }


# The canned opening debate for the NightOwl checkout-timeout incident.
def opening_turns() -> list[dict]:
    return [
        turn("orchestrator",
             "Checkout's down — payment gateway timeout. RootCause, your read?"),
        turn("rootcause",
             "Trace points at the gateway call in processPayment timing out, not the database.",
             emotion={"style": "methodical", "stability": 0.75}),
        turn("coder",
             "I'd wrap the gateway call in a configurable timeout with a real try/catch, "
             "and let a clean success response through."),
        turn("critic",
             "Hold on — retrying a gateway that's already down just hammers it. But bounded by "
             "the timeout with a clean fallback, it's acceptable. Confidence 0.78.",
             emotion={"style": "concerned", "stability": 0.30}, interrupts=True),
        turn("orchestrator",
             "Critic cleared it at 0.78. Approve the rollback?"),
    ]


def build_actions(session: dict) -> list[dict]:
    err = session.get("error_type", "CheckoutServiceTimeoutError")
    return [
        {"type": "rollback", "params": {}},
        {"type": "create_issue", "params": {
            "title": f"{err}",
            "body": "Auto-filed by Quorum. Rolled back the checkout gateway timeout.",
        }},
        {"type": "jira_stub", "params": {}},
    ]


# ── Seam 1 ────────────────────────────────────────────────────────────────────
@app.post("/session/event")
def on_event(e: EventIn):
    sid = e.session_id or f"inc_{len(SESSIONS) + 1:03d}"

    # The mitigated handshake: n8n reports actuators are done.
    if e.event_type == "actuators_done":
        SESSIONS.setdefault(sid, {})["status"] = "mitigated"
        return reply(sid, "mitigated", [
            turn("orchestrator",
                 "Rollback's in, store's recovering. Issue filed, ticket QUO-142 created. "
                 "Closing the room."),
        ])

    # A new incident.
    SESSIONS[sid] = {
        "status": "awaiting_approval",
        "error_type": e.payload.get("error_type", "CheckoutServiceTimeoutError"),
    }
    return reply(sid, "awaiting_approval", opening_turns())


# ── Seam 2 ────────────────────────────────────────────────────────────────────
@app.post("/session/message")
def on_message(m: MessageIn):
    session = SESSIONS.setdefault(m.session_id, {"status": "awaiting_approval"})
    arousal = float(m.emotion.get("arousal", 0) or 0)
    valence = float(m.emotion.get("valence", 0) or 0)

    # Emotion gate: stressed + negative → hold (the gold feature).
    if arousal > 0.6 and valence < 0:
        session["status"] = "awaiting_approval"
        return reply(m.session_id, "awaiting_approval", [
            turn("orchestrator",
                 "You don't sound sure about this. Want me to hold?",
                 emotion={"style": "concerned", "stability": 0.30}),
        ])

    # Already acting? Don't re-fire actions (idempotency).
    if session.get("status") == "acting":
        return reply(m.session_id, "acting", [])

    # Approve + sounds sure → act, emit actions exactly once.
    session["status"] = "acting"
    return reply(m.session_id, "acting", [
        turn("orchestrator", "Shipping the rollback and opening the issue now."),
    ], actions=build_actions(session))


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"ok": True, "service": "quorum-mock-brain"}
