"""Unit tests for brain/agents.py. OpenRouter is fully mocked — no API key needed."""
import pytest

from models import Critique, Session, StackFrame, Status, Trigger, Turn
from agents import (
    VOICES,
    Models,
    classify,
    coder_propose,
    coder_revise,
    critic_review,
    orchestrator_act,
    orchestrator_ask,
    orchestrator_escalate,
    orchestrator_open,
    pm,
    rootcause,
)


# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------

def _trigger() -> Trigger:
    return Trigger(
        source="nightowl",
        event_type="error",
        service="checkout-service",
        error_type="CheckoutServiceTimeoutError",
        message="Payment gateway did not respond in time",
        stack_frames=[StackFrame(file="server/index.js", line=142, function="processPayment")],
    )


def _session() -> Session:
    return Session(session_id="inc_001", trigger=_trigger())


# superset fake response — each wrapper reads only its own keys
_FAKE_LLM = {
    "spoken": "Test spoken line.",
    "hypothesis": "Gateway call on empty cart times out.",
    "proposed_fix": "Wrap with configurable timeout and try/catch.",
    "verdict": "approve",
    "confidence": 0.80,
    "blockers": [],
    "intent": "approve",
}

_FAKE_LLM_LOW_CONFIDENCE = {**_FAKE_LLM, "verdict": "revise", "confidence": 0.55, "blockers": ["Empty-cart path not guarded."]}


# ---------------------------------------------------------------------------
# model tier contract
# ---------------------------------------------------------------------------

def test_critic_model_never_free():
    assert ":free" not in Models.CRITIC


# ---------------------------------------------------------------------------
# orchestrator_open
# ---------------------------------------------------------------------------

def test_orchestrator_open_returns_turn(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM)
    s = _session()
    t = orchestrator_open(s)
    assert isinstance(t, Turn)
    assert t.agent == "orchestrator"
    assert t.voice_id == VOICES["orchestrator"]
    assert t.text == "Test spoken line."
    assert t.emotion == {}


# ---------------------------------------------------------------------------
# rootcause
# ---------------------------------------------------------------------------

def test_rootcause_sets_hypothesis(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM)
    s = _session()
    t = rootcause(s)
    assert s.hypothesis == "Gateway call on empty cart times out."
    assert t.agent == "rootcause"
    assert t.voice_id == VOICES["rootcause"]
    assert t.emotion == {"style": "methodical", "stability": 0.75}


def test_rootcause_scoped_user_message(monkeypatch):
    """User message must not include the whole transcript."""
    captured = {}

    def fake_run(model, system, user, temperature=0.4):
        captured["user"] = user
        return _FAKE_LLM

    monkeypatch.setattr("agents.run_agent", fake_run)
    s = _session()
    rootcause(s)
    # must contain service + error type + frames, must NOT contain session_id or status
    assert "checkout-service" in captured["user"]
    assert "CheckoutServiceTimeoutError" in captured["user"]
    assert "processPayment" in captured["user"]
    assert "session_id" not in captured["user"]


# ---------------------------------------------------------------------------
# coder_propose
# ---------------------------------------------------------------------------

def test_coder_propose_sets_proposed_fix(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM)
    s = _session()
    s.hypothesis = "Timeout in gateway call."
    t = coder_propose(s)
    assert s.proposed_fix == "Wrap with configurable timeout and try/catch."
    assert t.agent == "coder"
    assert t.voice_id == VOICES["coder"]
    assert t.emotion == {}


def test_coder_propose_includes_seed(monkeypatch):
    captured = {}

    def fake_run(model, system, user, temperature=0.4):
        captured["user"] = user
        return _FAKE_LLM

    monkeypatch.setattr("agents.run_agent", fake_run)
    s = _session()
    s.hypothesis = "Timeout in gateway call."
    coder_propose(s)
    assert "GATEWAY_TIMEOUT_MS" in captured["user"]


# ---------------------------------------------------------------------------
# coder_revise
# ---------------------------------------------------------------------------

def test_coder_revise_updates_proposed_fix(monkeypatch):
    revised = {**_FAKE_LLM, "proposed_fix": "Updated fix with guard."}
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: revised)
    s = _session()
    s.proposed_fix = "Old fix."
    s.critique = Critique(verdict="revise", confidence=0.55, blockers=["Empty-cart path not guarded."])
    t = coder_revise(s)
    assert s.proposed_fix == "Updated fix with guard."
    assert t.agent == "coder"
    assert t.voice_id == VOICES["coder"]


def test_coder_revise_scoped_to_fix_and_blockers(monkeypatch):
    captured = {}

    def fake_run(model, system, user, temperature=0.4):
        captured["user"] = user
        return _FAKE_LLM

    monkeypatch.setattr("agents.run_agent", fake_run)
    s = _session()
    s.proposed_fix = "Old fix."
    s.critique = Critique(verdict="revise", confidence=0.55, blockers=["Empty-cart path not guarded."])
    coder_revise(s)
    assert "Old fix." in captured["user"]
    assert "Empty-cart path not guarded." in captured["user"]
    assert "session_id" not in captured["user"]


# ---------------------------------------------------------------------------
# critic_review — emotion branch testing is the key here
# ---------------------------------------------------------------------------

def test_critic_review_approve_sets_critique(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM)
    s = _session()
    s.proposed_fix = "Some fix."
    t = critic_review(s)
    assert s.critique is not None
    assert s.critique.verdict == "approve"
    assert s.critique.confidence == 0.80
    assert s.critique.blockers == []
    assert t.agent == "critic"
    assert t.voice_id == VOICES["critic"]


def test_critic_review_emotion_calm_at_high_confidence(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM)  # confidence=0.80
    s = _session()
    s.proposed_fix = "Some fix."
    t = critic_review(s)
    assert t.emotion == {"style": "calm", "stability": 0.60}


def test_critic_review_emotion_concerned_at_low_confidence(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: _FAKE_LLM_LOW_CONFIDENCE)
    s = _session()
    s.proposed_fix = "Some fix."
    t = critic_review(s)
    assert t.emotion == {"style": "concerned", "stability": 0.30}
    assert s.critique.verdict == "revise"
    assert s.critique.blockers == ["Empty-cart path not guarded."]


def test_critic_review_emotion_threshold_boundary(monkeypatch):
    # exactly 0.7 → calm
    at_threshold = {**_FAKE_LLM, "confidence": 0.7}
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: at_threshold)
    s = _session()
    s.proposed_fix = "Some fix."
    t = critic_review(s)
    assert t.emotion == {"style": "calm", "stability": 0.60}


def test_critic_review_scoped_to_proposed_fix(monkeypatch):
    captured = {}

    def fake_run(model, system, user, temperature=0.4):
        captured["user"] = user
        return _FAKE_LLM

    monkeypatch.setattr("agents.run_agent", fake_run)
    s = _session()
    s.proposed_fix = "Specific fix text."
    critic_review(s)
    assert "Specific fix text." in captured["user"]
    assert "session_id" not in captured["user"]


# ---------------------------------------------------------------------------
# orchestrator_ask — deterministic, no mock needed
# ---------------------------------------------------------------------------

def test_orchestrator_ask_normal_references_confidence():
    s = _session()
    s.critique = Critique(verdict="approve", confidence=0.78)
    t = orchestrator_ask(s)
    assert t.agent == "orchestrator"
    assert t.voice_id == VOICES["orchestrator"]
    assert "0.78" in t.text


def test_orchestrator_ask_hesitant_branch():
    s = _session()
    t = orchestrator_ask(s, hesitant=True)
    assert t.agent == "orchestrator"
    assert "sure" in t.text.lower()
    assert "hold" in t.text.lower()


# ---------------------------------------------------------------------------
# orchestrator_escalate — deterministic
# ---------------------------------------------------------------------------

def test_orchestrator_escalate():
    s = _session()
    t = orchestrator_escalate(s)
    assert t.agent == "orchestrator"
    assert t.voice_id == VOICES["orchestrator"]
    assert len(t.text) > 0


# ---------------------------------------------------------------------------
# orchestrator_act — deterministic
# ---------------------------------------------------------------------------

def test_orchestrator_act():
    s = _session()
    t = orchestrator_act(s)
    assert t.agent == "orchestrator"
    assert t.voice_id == VOICES["orchestrator"]
    assert "rollback" in t.text.lower() or "shipping" in t.text.lower()


# ---------------------------------------------------------------------------
# pm — deterministic
# ---------------------------------------------------------------------------

def test_pm_returns_jira_line():
    s = _session()
    t = pm(s)
    assert t.agent == "pm"
    assert t.voice_id == VOICES["pm"]
    assert "QUO-" in t.text
    assert "created" in t.text.lower()


# ---------------------------------------------------------------------------
# classify — mocked
# ---------------------------------------------------------------------------

def test_classify_approve(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: {"intent": "approve"})
    assert classify("ship it") == "approve"


def test_classify_debate_again(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: {"intent": "debate_again"})
    assert classify("let's debate again") == "debate_again"


def test_classify_redirect(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: {"intent": "redirect"})
    assert classify("skip the analysis") == "redirect"


def test_classify_unknown(monkeypatch):
    monkeypatch.setattr("agents.run_agent", lambda *a, **kw: {"intent": "unknown"})
    assert classify("what time is it") == "unknown"


def test_classify_uses_free_model(monkeypatch):
    captured = {}

    def fake_run(model, system, user, temperature=0.0):
        captured["model"] = model
        return {"intent": "approve"}

    monkeypatch.setattr("agents.run_agent", fake_run)
    classify("ship it")
    assert captured["model"] == Models.CLASSIFY
