from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Status(str, Enum):
    TRIAGING = "triaging"
    DEBATING = "debating"
    AWAITING_APPROVAL = "awaiting_approval"
    ACTING = "acting"
    MITIGATED = "mitigated"


class Emotion(BaseModel):
    valence: float = 0.0     # -1..1  (negative = bad)
    arousal: float = 0.0     #  0..1  (high = activated/stressed)
    label: str = "neutral"


class StackFrame(BaseModel):
    file: str
    line: int
    function: str


class Trigger(BaseModel):
    source: str
    event_type: str
    service: Optional[str] = None
    error_type: Optional[str] = None
    message: Optional[str] = None
    stack_frames: list[StackFrame] = []


class Turn(BaseModel):
    agent: str
    text: str
    voice_id: str
    emotion: dict = {}        # ElevenLabs delivery hints
    interrupts: bool = False


class Critique(BaseModel):
    verdict: Literal["approve", "reject", "revise"]
    confidence: float
    blockers: list[str] = []


class Action(BaseModel):
    type: str
    params: dict = {}


class Session(BaseModel):
    session_id: str
    status: Status = Status.TRIAGING
    trigger: Trigger
    transcript: list[Turn] = []
    hypothesis: Optional[str] = None
    proposed_fix: Optional[str] = None
    critique: Optional[Critique] = None
    human_emotion: Emotion = Emotion()
    room_mood: Emotion = Emotion()
    actions: list[Action] = []
    revise_count: int = 0


class IncomingMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    session_id: str
    sender: str = Field("user", alias="from")
    text: str
    emotion: Emotion = Emotion()
    is_interrupt: bool = False
