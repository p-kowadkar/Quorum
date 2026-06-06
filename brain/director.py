from models import Action, IncomingMessage, Session, Status, Turn
from agents import (
    classify,
    coder_propose,
    coder_revise,
    critic_review,
    orchestrator_act,
    orchestrator_ask,
    orchestrator_escalate,
    orchestrator_open,
    rootcause,
)

CONFIDENCE_BAR = 0.65
MAX_REVISIONS = 3


def advance(s: Session, msg: IncomingMessage | None = None) -> list[Turn]:
    if msg and msg.sender == "user":
        s.human_emotion = msg.emotion
        intent = classify(msg.text)
        if intent == "approve" and s.status == Status.AWAITING_APPROVAL:
            return _handle_approval(s, msg)
        if intent == "debate_again":
            s.status = Status.DEBATING
            s.revise_count = 0
            return _run_debate(s)
        if intent == "redirect":
            return _reroute(s, msg)
        # absorb as context, continue current state

    if s.status == Status.TRIAGING:
        turns = [orchestrator_open(s), rootcause(s)]
        s.status = Status.DEBATING
        return turns + _run_debate(s)

    if s.status == Status.DEBATING:
        return _run_debate(s)

    return []


def _run_debate(s: Session) -> list[Turn]:
    turns = [coder_propose(s), critic_review(s)]
    return turns + _resolve_gate(s)


def _resolve_gate(s: Session) -> list[Turn]:
    c = s.critique
    if c.verdict == "approve" and c.confidence >= CONFIDENCE_BAR:
        s.status = Status.AWAITING_APPROVAL
        return [orchestrator_ask(s)]
    if s.revise_count < MAX_REVISIONS:
        s.revise_count += 1
        return [coder_revise(s), critic_review(s)] + _resolve_gate(s)
    # fail-closed: max revisions reached without clearing bar
    s.status = Status.AWAITING_APPROVAL
    return [orchestrator_escalate(s)]


def _handle_approval(s: Session, msg: IncomingMessage) -> list[Turn]:
    if msg.emotion.arousal > 0.6 and msg.emotion.valence < 0.0:
        return [orchestrator_ask(s, hesitant=True)]
    if not s.proposed_fix:
        return [orchestrator_escalate(s)]  # never fire actuators without a concrete fix
    s.status = Status.ACTING
    s.actions = _build_actions(s)
    return [orchestrator_act(s)]


def _reroute(s: Session, msg: IncomingMessage) -> list[Turn]:
    s.status = Status.DEBATING
    s.revise_count = 0
    return _run_debate(s)


def _build_actions(s: Session) -> list[Action]:
    return [
        Action(type="rollback"),
        Action(
            type="create_issue",
            params={
                "title": f"{s.trigger.error_type}",
                "body": f"Auto-filed by Quorum. Fix: {s.proposed_fix}",
            },
        ),
        Action(type="jira_stub"),
    ]
