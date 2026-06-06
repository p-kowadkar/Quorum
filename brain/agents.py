"""Agent wrappers over OpenRouter.

Signatures are the frozen contract that director.py / app.py import.
The lazy client matters — a module-scope OpenAI(...) with os.environ[...]
would crash at import time and take every test down before a mock could run.
"""
import json
import os
from functools import lru_cache
from pathlib import Path

from models import Critique, Session, Turn

PROMPTS = Path(__file__).parent / "prompts"

VOICES = {
    "orchestrator": os.environ.get("VOICE_ORCHESTRATOR", "el_orch"),
    "rootcause": os.environ.get("VOICE_ROOTCAUSE", "el_root"),
    "coder": os.environ.get("VOICE_CODER", "el_coder"),
    "critic": os.environ.get("VOICE_CRITIC", "el_critic"),
    "pm": os.environ.get("VOICE_PM", "el_pm"),
}


def _model(specific_var: str, default: str) -> str:
    # precedence: specific var → OPENROUTER_MODEL → hardcoded default
    return (
        os.environ.get(specific_var)
        or os.environ.get("OPENROUTER_MODEL")
        or default
    )


def _critic_model() -> str:
    resolved = _model("CRITIC_MODEL", "openai/gpt-5.3-codex")
    # INVARIANT: critic must never resolve to a :free model
    return resolved if ":free" not in resolved else "openai/gpt-5.3-codex"


class Models:
    # Slugs drift -- confirm current on openrouter.ai/models. The TIER is what matters.
    ORCHESTRATOR = _model("ORCHESTRATOR_MODEL", "deepseek/deepseek-v4-pro")
    ROOTCAUSE = _model("ROOTCAUSE_MODEL", "deepseek/deepseek-v4-pro")
    CODER = _model("CODER_MODEL", "openai/gpt-5.3-codex")
    CRITIC = _critic_model()   # never a :free model
    PM = _model("PM_MODEL", "google/gemini-3.5-flash")
    # CLASSIFY/BACKCHANNEL stay cheap/free by default; do NOT fall back to OPENROUTER_MODEL
    CLASSIFY = os.environ.get("CLASSIFY_MODEL") or "openai/gpt-oss-120b:free"
    BACKCHANNEL = os.environ.get("BACKCHANNEL_MODEL") or "openai/gpt-oss-120b:free"


@lru_cache(maxsize=1)
def get_client():
    from openai import OpenAI

    return OpenAI(
        api_key=os.environ.get("OPENROUTER_API_KEY", "missing-key"),
        base_url=os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    )


def run_agent(model: str, system: str, user: str, temperature: float = 0.4) -> dict:
    resp = get_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    return json.loads(resp.choices[0].message.content)


# --- agent wrappers -----------------------------------------------------------

def orchestrator_open(s: Session) -> Turn:
    system = (PROMPTS / "orchestrator.md").read_text()
    user = (
        f"Service: {s.trigger.service}\n"
        f"Error type: {s.trigger.error_type}\n"
        f"Message: {s.trigger.message}"
    )
    out = run_agent(Models.ORCHESTRATOR, system, user)
    return Turn(agent="orchestrator", text=out["spoken"], voice_id=VOICES["orchestrator"])


def rootcause(s: Session) -> Turn:
    system = (PROMPTS / "rootcause.md").read_text()
    frames = "\n".join(
        f"{f.function} @ {f.file}:{f.line}" for f in s.trigger.stack_frames
    )
    user = (
        f"Service: {s.trigger.service}\n"
        f"Error: {s.trigger.error_type}\n"
        f"Frames:\n{frames}"
    )
    out = run_agent(Models.ROOTCAUSE, system, user)
    s.hypothesis = out["hypothesis"]
    return Turn(
        agent="rootcause",
        text=out["spoken"],
        voice_id=VOICES["rootcause"],
        emotion={"style": "methodical", "stability": 0.75},
    )


def coder_propose(s: Session) -> Turn:
    from seed.known_fix import KNOWN_FIX

    system = (PROMPTS / "coder.md").read_text()
    user = (
        f"Hypothesis: {s.hypothesis}\n\n"
        f"Reference implementation (ground truth):\n{KNOWN_FIX}"
    )
    out = run_agent(Models.CODER, system, user)
    s.proposed_fix = out["proposed_fix"]
    return Turn(agent="coder", text=out["spoken"], voice_id=VOICES["coder"])


def coder_revise(s: Session) -> Turn:
    system = (PROMPTS / "coder.md").read_text()
    blockers = "\n".join(f"- {b}" for b in (s.critique.blockers if s.critique else []))
    user = (
        f"Current fix:\n{s.proposed_fix}\n\n"
        f"Critic blockers to address:\n{blockers}"
    )
    out = run_agent(Models.CODER, system, user)
    s.proposed_fix = out["proposed_fix"]
    return Turn(agent="coder", text=out["spoken"], voice_id=VOICES["coder"])


def critic_review(s: Session) -> Turn:
    system = (PROMPTS / "critic.md").read_text()
    user = f"Proposed fix:\n{s.proposed_fix}"
    out = run_agent(Models.CRITIC, system, user)
    s.critique = Critique(
        verdict=out["verdict"],
        confidence=out["confidence"],
        blockers=out.get("blockers", []),
    )
    # emotion derives from confidence, not a script
    if s.critique.confidence < 0.7:
        emotion = {"style": "concerned", "stability": 0.30}
    else:
        emotion = {"style": "calm", "stability": 0.60}
    return Turn(
        agent="critic",
        text=out["spoken"],
        voice_id=VOICES["critic"],
        emotion=emotion,
    )


def orchestrator_ask(s: Session, hesitant: bool = False) -> Turn:
    if hesitant:
        text = "You don't sound sure about this. Want me to hold?"
    else:
        text = (
            f"Critic cleared it at {s.critique.confidence:.2f}. "
            "Approve the rollback?"
        )
    return Turn(agent="orchestrator", text=text, voice_id=VOICES["orchestrator"])


def orchestrator_escalate(s: Session) -> Turn:
    text = (
        "We've hit the revision limit without clearing the bar. "
        "Escalating to you — do you want to approve manually or hold?"
    )
    return Turn(agent="orchestrator", text=text, voice_id=VOICES["orchestrator"])


def orchestrator_act(s: Session) -> Turn:
    text = "Shipping the rollback and opening the issue now."
    return Turn(agent="orchestrator", text=text, voice_id=VOICES["orchestrator"])


def pm(s: Session) -> Turn:
    return Turn(
        agent="pm",
        text="Ticket QUO-142 created, assigned to you.",
        voice_id=VOICES["pm"],
    )


# classify uses an inlined prompt — no classify.md (not in the whitelist of files to create)
_CLASSIFY_SYSTEM = (
    "You are an intent classifier. Given a message from an on-call engineer, "
    "classify their intent.\n\n"
    "Return ONLY a JSON object with this exact shape — no markdown, no extra keys:\n"
    '{"intent": "<approve|debate_again|redirect|unknown>"}\n\n'
    "approve: the engineer agrees and wants the fix shipped.\n"
    "debate_again: the engineer wants another round of analysis or debate.\n"
    "redirect: the engineer is changing the direction (e.g. skip analysis, try something else).\n"
    "unknown: none of the above."
)


def classify(text: str) -> str:
    out = run_agent(Models.CLASSIFY, _CLASSIFY_SYSTEM, text, temperature=0.0)
    return out["intent"]
