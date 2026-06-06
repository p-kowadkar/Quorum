from dotenv import load_dotenv

load_dotenv(override=False)

import os  # noqa: E402
from typing import Optional  # noqa: E402

from fastapi import Depends, FastAPI, Header, HTTPException  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from director import advance  # noqa: E402
from models import IncomingMessage, Session, Trigger  # noqa: E402

app = FastAPI()
SESSIONS: dict[str, Session] = {}


def require_secret(x_webhook_secret: Optional[str] = Header(default=None)) -> None:
    secret = os.environ.get("BRAIN_WEBHOOK_SECRET")
    if secret and x_webhook_secret != secret:
        raise HTTPException(status_code=401, detail="unauthorized")


class EventIn(BaseModel):
    session_id: Optional[str] = None
    source: str
    event_type: str
    payload: dict = {}


@app.post("/session/event", dependencies=[Depends(require_secret)])
def on_event(e: EventIn) -> dict:
    sid = e.session_id or f"inc_{len(SESSIONS)+1:03d}"
    s = SESSIONS.get(sid) or Session(
        session_id=sid,
        trigger=Trigger(source=e.source, event_type=e.event_type, **e.payload),
    )
    SESSIONS[sid] = s
    turns = advance(s)
    s.transcript += turns
    return {
        "session_id": sid,
        "status": s.status,
        "turns": [t.model_dump() for t in turns],
        "actions": [a.model_dump() for a in s.actions] if s.status == "acting" else [],
    }


@app.post("/session/message", dependencies=[Depends(require_secret)])
def on_message(msg: IncomingMessage) -> dict:
    s = SESSIONS.get(msg.session_id)
    if s is None:
        raise HTTPException(status_code=404, detail="session not found")
    turns = advance(s, msg)
    s.transcript += turns
    return {
        "session_id": s.session_id,
        "status": s.status,
        "turns": [t.model_dump() for t in turns],
        "actions": [a.model_dump() for a in s.actions] if s.status == "acting" else [],
    }
