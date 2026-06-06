export const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type AgentKey = "orchestrator" | "rootcause" | "coder" | "critic";

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
};

export const AGENT_ORDER: AgentKey[] = ["orchestrator", "rootcause", "coder", "critic"];

// bright status colors for the dark demo panel
export const STATUS = {
  degraded: { label: "degraded", hex: "#FBBF24" },
  mitigated: { label: "mitigated", hex: "#34D399" },
} as const;
