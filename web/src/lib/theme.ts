export const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Streamed-chat cadence — shared by the LiveRoom demo and the hero reveal so the
// left-hand copy lands on the same beat as the messages streaming on the right.
export const STREAM_FIRST_DELAY = 600; // ms before the first beat
export const STREAM_STEP_DELAY = 1500; // ms between beats

export type AgentKey = "orchestrator" | "rootcause" | "coder" | "critic" | "pm";

// hex = legible on the light canvas; glow = brighter variant for the dark demo panel
export const AGENTS: Record<
  AgentKey,
  { label: string; role: string; hex: string; glow: string }
> = {
  orchestrator: {
    label: "Orchestrator",
    role: "Runs the room, hands off by name",
    hex: "#2563EB",
    glow: "#60A5FA",
  },
  rootcause: {
    label: "RootCause",
    role: "Reads the stack trace, posts a hypothesis",
    hex: "#0891B2",
    glow: "#22D3EE",
  },
  coder: {
    label: "Coder",
    role: "Drafts the patch",
    hex: "#7C3AED",
    glow: "#A78BFA",
  },
  critic: {
    label: "Critic",
    role: "Is this production-ready? Verdict + confidence",
    hex: "#E11D48",
    glow: "#FB7185",
  },
  pm: {
    label: "Project Manager",
    role: "Files the ticket, then steps back",
    hex: "#475569",
    glow: "#94A3B8",
  },
};

export const AGENT_ORDER: AgentKey[] = [
  "orchestrator",
  "rootcause",
  "coder",
  "critic",
  "pm",
];

// bright status colors for the dark demo panel
export const STATUS = {
  degraded: { label: "degraded", hex: "#FBBF24" },
  mitigated: { label: "mitigated", hex: "#34D399" },
} as const;
