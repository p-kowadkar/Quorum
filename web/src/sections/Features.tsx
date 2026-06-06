import { useReducedMotion } from "framer-motion";
import { Microphone } from "@phosphor-icons/react";

import { AGENTS, AGENT_ORDER, type AgentKey } from "../lib/theme";
import { Section } from "../components/ui/Section";
import { Chip } from "../components/ui/Chip";
import { Reveal } from "../components/ui/Reveal";

const DEBATE_COPY = {
  kicker: "what wins the room",
  title: "The room argues before it acts.",
  featureA: {
    label: "Audible debate",
    heading: "Four voices. One verdict.",
    body: "RootCause posts the hypothesis. Coder drafts the patch. Critic asks whether it survives a traffic spike. Orchestrator calls the round when confidence converges. You hear every objection before a line of code is touched.",
    verdict: "0.78",
  },
  featureB: {
    label: "Emotion-gated approval",
    heading: "It won't ship if you don't sound sure.",
    body: 'When the room is ready, it asks you to approve out loud. If your voice wavers — pace off, pitch dropping — the gate holds. "You don\'t sound sure. Hold?" is not a bug. It\'s the whole point.',
    hold: "You don't sound sure. Hold?",
    ship: "Confidence cleared. Shipping.",
  },
} as const;

const DEBATE_AGENTS: AgentKey[] = ["rootcause", "coder", "critic"];

const WF_HEIGHTS = [14, 22, 18, 28, 20, 16, 24, 18, 12, 26, 20, 16, 22, 18, 24];

function WaveformBars({ hex, agentKey }: { hex: string; agentKey: string }) {
  const reduce = useReducedMotion();
  return (
    <span
      className="flex items-end gap-[2px]"
      aria-hidden="true"
      role="img"
    >
      {WF_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={reduce ? undefined : "wf-bar"}
          style={{
            display: "inline-block",
            width: 2,
            height: h,
            borderRadius: 1,
            backgroundColor: hex,
            opacity: 0.72,
            animationDelay: reduce ? undefined : `${(i * 73 + (agentKey.length * 17)) % 1100}ms`,
            transform: reduce ? `scaleY(0.5)` : undefined,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </span>
  );
}

function AgentVoiceRow({
  agentKey,
  isActive,
}: {
  agentKey: AgentKey;
  isActive: boolean;
}) {
  const agent = AGENTS[agentKey];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
        isActive ? "bg-surface shadow-card" : "bg-fg/[0.02]"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: agent.hex }}
        aria-hidden="true"
      />
      <span
        className="w-24 shrink-0 font-mono text-xs font-medium"
        style={{ color: agent.hex }}
      >
        {agent.label}
      </span>
      <WaveformBars hex={agent.hex} agentKey={agentKey} />
    </div>
  );
}

function DebateVisual() {
  const activeAgent: AgentKey = "critic";
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-ink p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          live debate
        </span>
        <Chip tone="neutral">round 2</Chip>
      </div>
      {DEBATE_AGENTS.map((key) => (
        <AgentVoiceRow key={key} agentKey={key} isActive={key === activeAgent} />
      ))}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-mono text-xs text-muted">confidence</span>
        <Chip tone="resolve">0.78</Chip>
      </div>
    </div>
  );
}

function MeterBar({ fill, color }: { fill: number; color: string }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.07]"
      role="meter"
      aria-valuenow={Math.round(fill * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Voice confidence"
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${fill * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ApprovalVisual() {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-ink p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          approval gate
        </span>
        <Microphone weight="duotone" size={16} className="text-muted" aria-hidden="true" />
      </div>

      {/* Uneasy reply */}
      <div className="rounded-xl border border-line bg-surface px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-xs text-muted">on-call</span>
          <Chip tone="alert">unsure</Chip>
        </div>
        <MeterBar fill={0.31} color="#B45309" />
        <p className="mt-2 font-sans text-sm text-muted">
          "yeah… I guess… go ahead"
        </p>
      </div>

      {/* Hold */}
      <div className="flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
        <Chip tone="alert">holding</Chip>
        <span className="font-sans text-sm text-alert">
          {DEBATE_COPY.featureB.hold}
        </span>
      </div>

      {/* Steady reply */}
      <div className="rounded-xl border border-line bg-surface px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-xs text-muted">on-call</span>
          <Chip tone="resolve">clear</Chip>
        </div>
        <MeterBar fill={0.91} color="#047857" />
        <p className="mt-2 font-sans text-sm text-fg">
          "Ship it."
        </p>
      </div>

      {/* Ships */}
      <div className="flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3">
        <Chip tone="resolve">shipping</Chip>
        <span className="font-sans text-sm text-resolve">
          {DEBATE_COPY.featureB.ship}
        </span>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <Section
      id="features"
      kicker={DEBATE_COPY.kicker}
      title={DEBATE_COPY.title}
    >
      <div className="flex flex-col gap-24">
        {/* Feature A: Audible debate — text left, visual right */}
        <Reveal>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-5">
              <Chip tone="rootcause" className="self-start">
                {DEBATE_COPY.featureA.label}
              </Chip>
              <h3 className="font-display text-2xl font-semibold leading-snug tracking-tightish text-fg sm:text-3xl">
                {DEBATE_COPY.featureA.heading}
              </h3>
              <p className="text-base leading-relaxed text-muted">
                {DEBATE_COPY.featureA.body}
              </p>
            </div>
            <div>
              <DebateVisual />
            </div>
          </div>
        </Reveal>

        {/* Feature B: Emotion-gated approval — visual left, text right */}
        <Reveal delay={0.08}>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <ApprovalVisual />
            </div>
            <div className="order-1 flex flex-col gap-5 lg:order-2">
              <Chip tone="critic" className="self-start">
                {DEBATE_COPY.featureB.label}
              </Chip>
              <h3 className="font-display text-2xl font-semibold leading-snug tracking-tightish text-fg sm:text-3xl">
                {DEBATE_COPY.featureB.heading}
              </h3>
              <p className="text-base leading-relaxed text-muted">
                {DEBATE_COPY.featureB.body}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
