import pytest
from fastapi.testclient import TestClient

from models import Critique, Session, Turn


def _stub_turn(agent: str = "orchestrator") -> Turn:
    return Turn(agent=agent, text="stub", voice_id=f"el_{agent}")


def _make_critic(verdict: str, confidence: float):
    def fake_critic(s: Session) -> Turn:
        s.critique = Critique(verdict=verdict, confidence=confidence)
        return _stub_turn("critic")
    return fake_critic


def _stub_coder(s: Session) -> Turn:
    # the real coder sets a concrete proposed_fix; mirror that so the
    # director's empty-fix guard sees a fix in the awaiting_approval state
    s.proposed_fix = s.proposed_fix or "wrap gateway call with timeout"
    return _stub_turn("coder")


def _patch_director_agents(monkeypatch, *, critic_fn=None, classify_fn=None):
    monkeypatch.setattr("director.orchestrator_open", lambda s: _stub_turn("orchestrator"))
    monkeypatch.setattr("director.rootcause", lambda s: _stub_turn("rootcause"))
    monkeypatch.setattr("director.coder_propose", _stub_coder)
    monkeypatch.setattr("director.coder_revise", _stub_coder)
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


@pytest.fixture(autouse=True)
def _clear_webhook_secret(monkeypatch):
    monkeypatch.delenv("BRAIN_WEBHOOK_SECRET", raising=False)


@pytest.fixture()
def client(monkeypatch):
    _patch_director_agents(monkeypatch)
    # import app AFTER patching so SESSIONS starts fresh each test
    import app as app_module
    app_module.SESSIONS.clear()
    return TestClient(app_module.app)


_EVENT_BODY = {
    "session_id": None,
    "source": "nightowl",
    "event_type": "error",
    "payload": {
        "service": "checkout-service",
        "error_type": "CheckoutServiceTimeoutError",
        "message": "Payment gateway timed out",
        "stack_frames": [
            {"file": "server/index.js", "line": 142, "function": "processPayment"}
        ],
    },
}


# --- Seam 1: POST /session/event ---------------------------------------------

def test_event_returns_session_id_and_status(client):
    resp = client.post("/session/event", json=_EVENT_BODY)
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert data["session_id"].startswith("inc_")
    assert data["status"] == "awaiting_approval"
    assert isinstance(data["turns"], list)
    assert len(data["turns"]) > 0


def test_event_turns_have_required_fields(client):
    resp = client.post("/session/event", json=_EVENT_BODY)
    for turn in resp.json()["turns"]:
        assert "agent" in turn
        assert "text" in turn
        assert "voice_id" in turn


def test_event_actions_empty_unless_acting(client):
    resp = client.post("/session/event", json=_EVENT_BODY)
    data = resp.json()
    if data["status"] != "acting":
        assert data["actions"] == []


def test_event_explicit_session_id(client):
    body = {**_EVENT_BODY, "session_id": "inc_custom"}
    resp = client.post("/session/event", json=body)
    assert resp.json()["session_id"] == "inc_custom"


# --- Seam 2: POST /session/message + approval flow ---------------------------

def _post_event(client) -> str:
    resp = client.post("/session/event", json=_EVENT_BODY)
    return resp.json()["session_id"]


def test_message_unknown_session_returns_404(client):
    resp = client.post("/session/message", json={
        "session_id": "doesnotexist",
        "from": "user",
        "text": "ship it",
    })
    assert resp.status_code == 404


def test_steady_approval_yields_acting_with_actions(monkeypatch):
    _patch_director_agents(
        monkeypatch,
        critic_fn=_make_critic("approve", 0.9),
        classify_fn=lambda text: "approve",
    )
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)

    sid = c.post("/session/event", json=_EVENT_BODY).json()["session_id"]

    resp = c.post("/session/message", json={
        "session_id": sid,
        "from": "user",
        "text": "ship it",
        "emotion": {"valence": 0.3, "arousal": 0.2, "label": "calm"},
        "is_interrupt": False,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "acting"
    assert len(data["actions"]) == 3
    action_types = [a["type"] for a in data["actions"]]
    assert "rollback" in action_types
    assert "create_issue" in action_types
    assert "jira_stub" in action_types


def test_hesitant_approval_stays_awaiting(monkeypatch):
    _patch_director_agents(
        monkeypatch,
        critic_fn=_make_critic("approve", 0.9),
        classify_fn=lambda text: "approve",
    )
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)

    sid = c.post("/session/event", json=_EVENT_BODY).json()["session_id"]

    resp = c.post("/session/message", json={
        "session_id": sid,
        "from": "user",
        "text": "i guess ship it",
        "emotion": {"valence": -0.6, "arousal": 0.8, "label": "stressed"},
        "is_interrupt": False,
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "awaiting_approval"
    assert resp.json()["actions"] == []


# --- P2-d: boundary validation on /session/event ----------------------------

def test_event_malformed_missing_source_returns_422(client):
    body = {k: v for k, v in _EVENT_BODY.items() if k != "source"}
    resp = client.post("/session/event", json=body)
    assert resp.status_code == 422


def test_event_malformed_missing_event_type_returns_422(client):
    body = {k: v for k, v in _EVENT_BODY.items() if k != "event_type"}
    resp = client.post("/session/event", json=body)
    assert resp.status_code == 422


# --- P1-a: shared-secret auth ------------------------------------------------

def test_auth_no_secret_set_allows_request(client):
    # BRAIN_WEBHOOK_SECRET unset (guaranteed by autouse fixture) → no-op
    resp = client.post("/session/event", json=_EVENT_BODY)
    assert resp.status_code == 200


def test_auth_secret_set_no_header_returns_401(monkeypatch):
    monkeypatch.setenv("BRAIN_WEBHOOK_SECRET", "s3cr3t")
    _patch_director_agents(monkeypatch)
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)
    resp = c.post("/session/event", json=_EVENT_BODY)
    assert resp.status_code == 401


def test_auth_secret_set_wrong_header_returns_401(monkeypatch):
    monkeypatch.setenv("BRAIN_WEBHOOK_SECRET", "s3cr3t")
    _patch_director_agents(monkeypatch)
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)
    resp = c.post("/session/event", json=_EVENT_BODY, headers={"X-Webhook-Secret": "wrong"})
    assert resp.status_code == 401


def test_auth_secret_set_correct_header_returns_200(monkeypatch):
    monkeypatch.setenv("BRAIN_WEBHOOK_SECRET", "s3cr3t")
    _patch_director_agents(monkeypatch)
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)
    resp = c.post("/session/event", json=_EVENT_BODY, headers={"X-Webhook-Secret": "s3cr3t"})
    assert resp.status_code == 200


def test_auth_secret_set_on_message_endpoint_no_header_returns_401(monkeypatch):
    monkeypatch.setenv("BRAIN_WEBHOOK_SECRET", "s3cr3t")
    _patch_director_agents(monkeypatch)
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)
    resp = c.post("/session/message", json={
        "session_id": "doesnotexist",
        "from": "user",
        "text": "ship it",
    })
    assert resp.status_code == 401


def test_auth_secret_set_on_message_endpoint_correct_header_returns_404(monkeypatch):
    # Correct secret → auth passes → 404 because session doesn't exist
    monkeypatch.setenv("BRAIN_WEBHOOK_SECRET", "s3cr3t")
    _patch_director_agents(monkeypatch)
    import app as app_module
    app_module.SESSIONS.clear()
    c = TestClient(app_module.app)
    resp = c.post("/session/message", json={
        "session_id": "doesnotexist",
        "from": "user",
        "text": "ship it",
    }, headers={"X-Webhook-Secret": "s3cr3t"})
    assert resp.status_code == 404
