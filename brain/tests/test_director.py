from models import Critique, Emotion, IncomingMessage, Session, Status, Trigger, Turn


def _session() -> Session:
    return Session(
        session_id="inc_001",
        trigger=Trigger(
            source="nightowl",
            event_type="error",
            service="checkout-service",
            error_type="CheckoutServiceTimeoutError",
            message="Payment gateway timed out",
        ),
    )


def _stub_turn(agent: str = "critic") -> Turn:
    return Turn(agent=agent, text="stub", voice_id=f"el_{agent}")


def _make_critic(verdict: str, confidence: float):
    def fake_critic(s: Session) -> Turn:
        s.critique = Critique(verdict=verdict, confidence=confidence)
        return _stub_turn("critic")
    return fake_critic


def _patch_all_agents(monkeypatch, *, critic_fn=None, classify_fn=None):
    import director

    monkeypatch.setattr("director.orchestrator_open", lambda s: _stub_turn("orchestrator"))
    monkeypatch.setattr("director.rootcause", lambda s: _stub_turn("rootcause"))
    monkeypatch.setattr("director.coder_propose", lambda s: _stub_turn("coder"))
    monkeypatch.setattr("director.coder_revise", lambda s: _stub_turn("coder"))
    monkeypatch.setattr("director.orchestrator_ask", lambda s, hesitant=False: _stub_turn("orchestrator"))
    monkeypatch.setattr("director.orchestrator_escalate", lambda s: _stub_turn("orchestrator"))
    monkeypatch.setattr("director.orchestrator_act", lambda s: _stub_turn("orchestrator"))

    if critic_fn is not None:
        monkeypatch.setattr("director.critic_review", critic_fn)
    else:
        monkeypatch.setattr("director.critic_review", _make_critic("approve", 0.9))

    if classify_fn is not None:
        monkeypatch.setattr("director.classify", classify_fn)
    else:
        monkeypatch.setattr("director.classify", lambda text: "unknown")


# --- confidence gate clears ---------------------------------------------------

def test_gate_clears_at_high_confidence(monkeypatch):
    _patch_all_agents(monkeypatch, critic_fn=_make_critic("approve", 0.80))
    from director import advance

    s = _session()
    advance(s)
    assert s.status == Status.AWAITING_APPROVAL


# --- gate clears at the threshold exactly ------------------------------------

def test_gate_clears_at_bar(monkeypatch):
    _patch_all_agents(monkeypatch, critic_fn=_make_critic("approve", 0.65))
    from director import advance

    s = _session()
    advance(s)
    assert s.status == Status.AWAITING_APPROVAL


# --- low confidence loops then fail-closes -----------------------------------

def test_low_confidence_escalates_after_max_revisions(monkeypatch):
    _patch_all_agents(monkeypatch, critic_fn=_make_critic("revise", 0.40))
    from director import advance
    from director import MAX_REVISIONS

    s = _session()
    advance(s)
    assert s.status == Status.AWAITING_APPROVAL
    assert s.revise_count == MAX_REVISIONS


# --- emotion gate: hesitant approval stays awaiting_approval -----------------

def test_hesitant_approval_stays_awaiting(monkeypatch):
    _patch_all_agents(monkeypatch, classify_fn=lambda text: "approve")
    from director import advance

    s = _session()
    s.status = Status.AWAITING_APPROVAL

    msg = IncomingMessage(
        session_id="inc_001",
        sender="user",
        text="ok ship it",
        emotion=Emotion(arousal=0.8, valence=-0.5, label="stressed"),
    )
    advance(s, msg)
    assert s.status == Status.AWAITING_APPROVAL


# --- steady approval transitions to acting with actions ----------------------

def test_steady_approval_transitions_to_acting(monkeypatch):
    _patch_all_agents(monkeypatch, classify_fn=lambda text: "approve")
    from director import advance

    s = _session()
    s.status = Status.AWAITING_APPROVAL
    s.proposed_fix = "wrap gateway call with timeout"

    msg = IncomingMessage(
        session_id="inc_001",
        sender="user",
        text="ship it",
        emotion=Emotion(arousal=0.2, valence=0.3, label="calm"),
    )
    turns = advance(s, msg)
    assert s.status == Status.ACTING
    assert len(s.actions) == 3
    action_types = [a.type for a in s.actions]
    assert "rollback" in action_types
    assert "create_issue" in action_types
    assert "jira_stub" in action_types
    assert len(turns) == 1


# --- debate_again resets and re-debates --------------------------------------

def test_debate_again_resets_revise_count(monkeypatch):
    _patch_all_agents(
        monkeypatch,
        critic_fn=_make_critic("approve", 0.80),
        classify_fn=lambda text: "debate_again",
    )
    from director import advance

    s = _session()
    s.status = Status.AWAITING_APPROVAL
    s.revise_count = 2

    msg = IncomingMessage(session_id="inc_001", sender="user", text="debate again")
    advance(s, msg)
    assert s.status == Status.AWAITING_APPROVAL


# --- approve while TRIAGING must not transition to ACTING --------------------

def test_approve_during_triaging_is_absorbed(monkeypatch):
    _patch_all_agents(monkeypatch, classify_fn=lambda text: "approve")
    from director import advance

    s = _session()
    s.status = Status.TRIAGING

    msg = IncomingMessage(
        session_id="inc_001",
        sender="user",
        text="approve",
        emotion=Emotion(arousal=0.1, valence=0.5, label="calm"),
    )
    advance(s, msg)
    assert s.status != Status.ACTING
    assert not s.actions
    assert s.proposed_fix is None


# --- redirect runs a fresh propose+critic round ------------------------------

def test_redirect_runs_debate(monkeypatch):
    _patch_all_agents(
        monkeypatch,
        critic_fn=_make_critic("approve", 0.80),
        classify_fn=lambda text: "redirect",
    )
    from director import advance

    s = _session()
    s.status = Status.AWAITING_APPROVAL

    msg = IncomingMessage(session_id="inc_001", sender="user", text="skip analysis just fix it")
    turns = advance(s, msg)
    assert len(turns) > 0
    assert s.status == Status.AWAITING_APPROVAL


# --- approval with no concrete fix must not ship actions ----------------------

def test_approval_with_empty_fix_does_not_ship(monkeypatch):
    _patch_all_agents(monkeypatch, classify_fn=lambda text: "approve")
    from director import advance

    s = _session()
    s.status = Status.AWAITING_APPROVAL
    s.proposed_fix = None

    msg = IncomingMessage(
        session_id="inc_001",
        sender="user",
        text="ship it",
        emotion=Emotion(arousal=0.2, valence=0.3, label="calm"),
    )
    advance(s, msg)
    assert s.status == Status.AWAITING_APPROVAL
    assert not s.actions
