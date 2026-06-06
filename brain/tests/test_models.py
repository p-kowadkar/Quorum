from models import (
    Action,
    Critique,
    Emotion,
    IncomingMessage,
    Session,
    StackFrame,
    Status,
    Trigger,
    Turn,
)


def _trigger() -> Trigger:
    return Trigger(
        source="nightowl",
        event_type="error",
        service="checkout-service",
        error_type="CheckoutServiceTimeoutError",
        message="Payment gateway did not respond in time",
        stack_frames=[StackFrame(file="server/index.js", line=142, function="processPayment")],
    )


def test_status_values():
    assert Status.TRIAGING == "triaging"
    assert Status.AWAITING_APPROVAL == "awaiting_approval"
    assert [s.value for s in Status] == [
        "triaging", "debating", "awaiting_approval", "acting", "mitigated",
    ]


def test_emotion_defaults():
    e = Emotion()
    assert (e.valence, e.arousal, e.label) == (0.0, 0.0, "neutral")


def test_turn_defaults():
    t = Turn(agent="critic", text="hi", voice_id="el_critic")
    assert t.emotion == {}
    assert t.interrupts is False


def test_incoming_message_from_alias():
    m = IncomingMessage.model_validate(
        {
            "session_id": "inc_001",
            "from": "user",
            "text": "ship it",
            "emotion": {"valence": -0.3, "arousal": 0.7, "label": "stressed"},
            "is_interrupt": True,
        }
    )
    assert m.sender == "user"
    assert m.emotion.arousal == 0.7
    assert m.is_interrupt is True


def test_incoming_message_populate_by_name():
    m = IncomingMessage(session_id="inc_001", sender="user", text="hi")
    assert m.sender == "user"


def test_session_defaults():
    s = Session(session_id="inc_001", trigger=_trigger())
    assert s.status is Status.TRIAGING
    assert s.transcript == []
    assert s.actions == []
    assert s.revise_count == 0
    assert s.critique is None
    assert s.human_emotion.label == "neutral"


def test_seam3_roundtrip():
    s = Session(session_id="inc_001", trigger=_trigger())
    s.transcript.append(
        Turn(agent="critic", text="hold on", voice_id="el_critic",
             emotion={"stability": 0.30}, interrupts=True)
    )
    s.status = Status.ACTING
    s.actions = [
        Action(type="rollback"),
        Action(type="create_issue", params={"title": "x", "body": "y"}),
    ]
    dumped = {
        "session_id": s.session_id,
        "status": s.status.value,
        "turns": [t.model_dump() for t in s.transcript],
        "actions": [a.model_dump() for a in s.actions],
    }
    assert dumped["status"] == "acting"
    assert dumped["turns"][0]["agent"] == "critic"
    assert dumped["turns"][0]["interrupts"] is True
    assert dumped["actions"][0] == {"type": "rollback", "params": {}}
    assert dumped["actions"][1]["params"]["title"] == "x"


def test_critique_defaults():
    c = Critique(verdict="approve", confidence=0.78)
    assert c.blockers == []
