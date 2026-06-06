import type { ReactNode } from "react";

import { AGENTS, type AgentKey } from "../../lib/theme";

type Tone = "alert" | "resolve" | "neutral" | AgentKey;

const FIXED: Record<"alert" | "resolve" | "neutral", string> = {
  neutral: "bg-fg/[0.05] text-muted",
  alert: "bg-[#FEF3C7] text-[#B45309]",
  resolve: "bg-[#D1FAE5] text-[#047857]",
};

export function Chip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-xs font-medium";

  if (tone === "alert" || tone === "resolve" || tone === "neutral") {
    return <span className={`${base} ${FIXED[tone]} ${className}`}>{children}</span>;
  }

  const agent = AGENTS[tone];
  return (
    <span
      className={`${base} ${className}`}
      style={{ backgroundColor: `${agent.hex}14`, color: agent.hex }}
    >
      {children}
    </span>
  );
}
