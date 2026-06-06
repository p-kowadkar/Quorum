import {
  Broadcast,
  ClipboardText,
  Code,
  MagnifyingGlass,
  Scales,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

import { Chip } from "../components/ui/Chip";
import { Reveal } from "../components/ui/Reveal";
import { Section } from "../components/ui/Section";
import { AGENTS, AGENT_ORDER, EASE_EXPO, type AgentKey } from "../lib/theme";

const TITLE = "Five specialists. One shared blackboard.";
const INTRO =
  "Each agent has a distinct job and a distinct voice. " +
  "They read the same session object — the incident trace, prior hypotheses, draft patches — " +
  "and write back to it. No peer-to-peer chatter. No crossed wires.";

const BLACKBOARD_DESC =
  "Every agent reads and writes a single shared session object: " +
  "the raw trace, posted hypotheses, draft patches, and review verdicts. " +
  "The Orchestrator sequences who speaks next. Specialists never talk directly to each other.";

const MODEL_TIER: Record<AgentKey, string> = {
  orchestrator: "mid",
  rootcause: "smart",
  coder: "smart",
  critic: "smart",
  pm: "cheap",
};

const AGENT_ICONS: Record<AgentKey, Icon> = {
  orchestrator: Broadcast,
  rootcause: MagnifyingGlass,
  coder: Code,
  critic: Scales,
  pm: ClipboardText,
};

const AGENT_ICON_ARIA: Record<AgentKey, string> = {
  orchestrator: "Broadcast tower icon",
  rootcause: "Magnifying glass icon",
  coder: "Code brackets icon",
  critic: "Scales icon",
  pm: "Clipboard icon",
};

// --- Living blackboard diagram -------------------------------------------------
// One self-contained SVG (scales via viewBox) so the flow physically connects
// each agent dot to the shared session node. Motion is layered only when motion
// is allowed; the reduced-motion branch renders the same geometry, held still.

const DIAGRAM = {
  width: 620,
  height: 208,
  agentX: 92, // x of the agent dots
  labelX: 104, // x where labels start
  connectX: 234, // connectors start here — clear of the longest label
  node: { x: 452, y: 60, w: 144, h: 88, r: 14 }, // session node rect
} as const;

const NODE_CX = DIAGRAM.node.x + DIAGRAM.node.w / 2;
const NODE_CY = DIAGRAM.node.y + DIAGRAM.node.h / 2;
const NODE_ENTRY_X = DIAGRAM.node.x; // left edge — where connectors land

// Evenly spaced vertical anchors for the five agents.
const AGENT_Y: Record<AgentKey, number> = AGENT_ORDER.reduce(
  (acc, key, i) => {
    const top = 26;
    const gap = (DIAGRAM.height - top * 2) / (AGENT_ORDER.length - 1);
    return { ...acc, [key]: top + i * gap };
  },
  {} as Record<AgentKey, number>,
);

// A gentle cubic that leaves the agent row (clear of the label text) and
// converges into the left edge of the session node. A short horizontal "lead"
// at the agent's y keeps the line visually anchored to its dot without crossing
// the label glyphs.
function connectorPath(y: number): string {
  const x0 = DIAGRAM.connectX;
  const x1 = NODE_ENTRY_X;
  const cx = (x0 + x1) / 2;
  return `M ${x0} ${y} C ${cx} ${y}, ${cx} ${NODE_CY}, ${x1} ${NODE_CY}`;
}

// Pulse cadence: one packet leaves an agent every PULSE_PERIOD, staggered so the
// five never fire on the same beat (reads as a steady conversation, not a strobe).
const PULSE_PERIOD = 2.6; // seconds per traveling pulse
const PULSE_DASH = 14; // length of the lit "packet"
const PULSE_GAP = 150; // dark space between packets (keeps one packet on the wire)

export function HowItWorks() {
  return (
    <Section id="how" kicker="the cast" title={TITLE} intro={INTRO}>
      {/* Agent cards grid */}
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5"
        role="list"
        aria-label="Quorum specialist agents"
      >
        {AGENT_ORDER.map((key, i) => {
          const agent = AGENTS[key];
          const IconComponent = AGENT_ICONS[key];
          return (
            <Reveal key={key} delay={i * 0.08} y={14}>
              <article
                className="flex h-full flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-shadow duration-200 hover:shadow-card"
                role="listitem"
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${agent.hex}14` }}
                >
                  <IconComponent
                    size={22}
                    weight="duotone"
                    color={agent.hex}
                    aria-label={AGENT_ICON_ARIA[key]}
                  />
                </div>

                {/* Label + role */}
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-base font-semibold tracking-tightish text-fg">
                    {agent.label}
                  </h3>
                  <p className="text-sm leading-snug text-muted">{agent.role}</p>
                </div>

                {/* Model tier chip */}
                <div className="mt-auto pt-1">
                  <Chip tone={key}>{MODEL_TIER[key]}</Chip>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* Blackboard diagram + explainer */}
      <Reveal delay={0.4}>
        <div className="mt-14 rounded-card border border-line bg-surface p-8">
          <h3 className="font-display text-lg font-semibold tracking-tightish text-fg">
            The blackboard
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {BLACKBOARD_DESC}
          </p>

          {/* Living diagram: five specialists flowing into one shared session */}
          <BlackboardDiagram />
        </div>
      </Reveal>
    </Section>
  );
}

function BlackboardDiagram() {
  const reduce = useReducedMotion() ?? false;
  return (
    <div
      className="mt-8"
      role="img"
      aria-label="Diagram: five specialist agents — Orchestrator, RootCause, Coder, Critic, and Project Manager — continuously read and write a single shared session blackboard."
    >
      {/* Desktop / tablet: one converging SVG that scales with the card */}
      <div className="hidden sm:block">
        <DiagramSvg reduce={reduce} />
      </div>
      {/* Mobile: stacked agents flowing down into the session node */}
      <div className="block sm:hidden">
        <DiagramStacked reduce={reduce} />
      </div>
    </div>
  );
}

function DiagramSvg({ reduce }: { reduce: boolean }) {
  return (
    <svg
      className="mx-auto block h-auto w-full max-w-[540px] overflow-visible"
      viewBox={`0 0 ${DIAGRAM.width} ${DIAGRAM.height}`}
      fill="none"
      aria-hidden="true"
    >
      {/* connectors + traveling pulses */}
      {AGENT_ORDER.map((key, i) => (
        <Connector
          key={key}
          agentKey={key}
          y={AGENT_Y[key]}
          index={i}
          reduce={reduce}
        />
      ))}

      {/* agent dots + labels */}
      {AGENT_ORDER.map((key, i) => (
        <AgentNode
          key={key}
          agentKey={key}
          y={AGENT_Y[key]}
          index={i}
          reduce={reduce}
        />
      ))}

      {/* the shared session blackboard */}
      <SessionNode reduce={reduce} />
    </svg>
  );
}

function Connector({
  agentKey,
  y,
  index,
  reduce,
}: {
  agentKey: AgentKey;
  y: number;
  index: number;
  reduce: boolean;
}) {
  const d = connectorPath(y);
  const hex = AGENTS[agentKey].hex;
  return (
    <g>
      {/* faint static rail */}
      <path
        d={d}
        stroke="#E2E5EA"
        strokeWidth={1}
        strokeDasharray="3 3"
        fill="none"
      />
      {/* lit packet traveling agent -> session (seamless via periodic dash) */}
      {reduce ? (
        // held still: a single calm packet sitting on the rail
        <path
          d={d}
          stroke={hex}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${PULSE_DASH} ${PULSE_GAP}`}
          strokeDashoffset={-PULSE_GAP * 0.5}
          fill="none"
          opacity={0.7}
        />
      ) : (
        <motion.path
          d={d}
          stroke={hex}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${PULSE_DASH} ${PULSE_GAP}`}
          fill="none"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -(PULSE_DASH + PULSE_GAP) }}
          transition={{
            duration: PULSE_PERIOD,
            ease: "linear",
            repeat: Infinity,
            delay: index * (PULSE_PERIOD / AGENT_ORDER.length),
          }}
        />
      )}
    </g>
  );
}

function AgentNode({
  agentKey,
  y,
  index,
  reduce,
}: {
  agentKey: AgentKey;
  y: number;
  index: number;
  reduce: boolean;
}) {
  const agent = AGENTS[agentKey];
  return (
    <g>
      {/* soft halo that pulses as this agent posts to the board */}
      {!reduce && (
        <motion.circle
          cx={DIAGRAM.agentX}
          cy={y}
          r={5}
          fill={agent.hex}
          initial={{ opacity: 0.18, scale: 1 }}
          animate={{ opacity: [0.18, 0, 0.18], scale: [1, 2.4, 1] }}
          transition={{
            duration: PULSE_PERIOD,
            ease: EASE_EXPO,
            repeat: Infinity,
            delay: index * (PULSE_PERIOD / AGENT_ORDER.length),
          }}
          style={{ transformOrigin: `${DIAGRAM.agentX}px ${y}px` }}
        />
      )}
      <circle cx={DIAGRAM.agentX} cy={y} r={5} fill={agent.hex} />
      <text
        x={DIAGRAM.labelX}
        y={y}
        dominantBaseline="middle"
        className="fill-muted font-mono"
        style={{ fontSize: 12 }}
      >
        {agent.label}
      </text>
    </g>
  );
}

function SessionNode({ reduce }: { reduce: boolean }) {
  const { x, y, w, h, r } = DIAGRAM.node;
  return (
    <g>
      {/* breathing glow ring */}
      {!reduce && (
        <motion.rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={r}
          ry={r}
          fill="none"
          stroke="#0B0D12"
          strokeWidth={1}
          initial={{ opacity: 0.06, scale: 1 }}
          animate={{ opacity: [0.05, 0.14, 0.05], scale: [1, 1.035, 1] }}
          transition={{ duration: PULSE_PERIOD, ease: "easeInOut", repeat: Infinity }}
          style={{ transformOrigin: `${NODE_CX}px ${NODE_CY}px` }}
        />
      )}
      {/* node body */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        className="fill-fg/[0.04] stroke-line"
        strokeWidth={1}
      />
      <text
        x={NODE_CX}
        y={NODE_CY - 8}
        textAnchor="middle"
        className="fill-muted font-mono"
        style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.18em" }}
      >
        SESSION
      </text>
      <text
        x={NODE_CX}
        y={NODE_CY + 12}
        textAnchor="middle"
        className="fill-muted/50 font-mono"
        style={{ fontSize: 9.5 }}
      >
        trace · hypotheses · patch · verdict
      </text>
    </g>
  );
}

// Mobile: a clean vertical stack with one tasteful downward flow (not five).
function DiagramStacked({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-row flex-wrap justify-center gap-4">
        {AGENT_ORDER.map((key) => (
          <span key={key} className="flex items-center gap-2">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: AGENTS[key].hex }}
              aria-hidden="true"
            />
          </span>
        ))}
      </div>

      {/* one downward connector with a single traveling pulse */}
      <svg
        width="18"
        height="44"
        viewBox="0 0 18 44"
        fill="none"
        aria-hidden="true"
      >
        <line
          x1="9"
          y1="0"
          x2="9"
          y2="36"
          stroke="#E2E5EA"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        {reduce ? (
          <line
            x1="9"
            y1="6"
            x2="9"
            y2="20"
            stroke="#5A6472"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : (
          <motion.line
            x1="9"
            y1="0"
            x2="9"
            y2="36"
            stroke="#5A6472"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="10 40"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -50 }}
            transition={{ duration: 1.8, ease: "linear", repeat: Infinity }}
          />
        )}
        <path
          d="M5 32l4 4 4-4"
          stroke="#CBD5E1"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* session node */}
      <motion.div
        className="rounded-card border border-line bg-fg/[0.04] px-5 py-3 text-center"
        animate={
          reduce
            ? undefined
            : { boxShadow: [
                "0 0 0 0 rgba(11,13,18,0)",
                "0 0 0 6px rgba(11,13,18,0.04)",
                "0 0 0 0 rgba(11,13,18,0)",
              ] }
        }
        transition={
          reduce
            ? undefined
            : { duration: 1.8, ease: "easeInOut", repeat: Infinity }
        }
      >
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          session
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted/50">
          trace · hypotheses · patch · verdict
        </p>
      </motion.div>
    </div>
  );
}
