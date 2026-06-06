import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Microphone } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import {
  AGENTS,
  EASE_EXPO,
  STATUS,
  STREAM_FIRST_DELAY,
  STREAM_STEP_DELAY,
  type AgentKey,
} from "../lib/theme";
import { Waveform } from "./Waveform";

type AgentLine = {
  side: "agent";
  key: AgentKey;
  text: string;
  confidence?: number;
};
type YouLine = {
  side: "you";
  text: string;
  duration: string;
};
type Line = AgentLine | YouLine;

// The incident, scripted. Order is the conversation order.
const SCRIPT: Line[] = [
  {
    side: "agent",
    key: "orchestrator",
    text: "Checkout's down — payment gateway timeout. RootCause?",
  },
  {
    side: "agent",
    key: "rootcause",
    text: "Gateway call on an empty cart is timing out, not the DB.",
  },
  {
    side: "agent",
    key: "coder",
    text: "Configurable timeout + a guarded retry around the call.",
  },
  {
    side: "agent",
    key: "critic",
    text: "That retry hammers a gateway already down — but acceptable. Confidence",
    confidence: 0.78,
  },
  {
    side: "agent",
    key: "orchestrator",
    text: "Cleared at 0.78. Approve the rollback?",
  },
  { side: "you", text: "Ship it.", duration: "0:02" },
  {
    side: "agent",
    key: "orchestrator",
    text: "Rolling back. Issue filed.",
  },
  {
    side: "agent",
    key: "pm",
    text: "Ticket QUO-142 created. Assigned to you.",
  },
];

const LOOP_PAUSE = 4200; // ms to hold the resolved state before replaying

function AgentMessage({ line }: { line: AgentLine }) {
  const agent = AGENTS[line.key];
  return (
    <div className="flex max-w-[88%] flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-pill"
          style={{ backgroundColor: agent.glow }}
        />
        <span
          className="font-mono text-xs tracking-tightish"
          style={{ color: agent.glow }}
        >
          {agent.label}
        </span>
      </div>
      <div className="rounded-card rounded-tl-sm border border-panel-line bg-panel-fg/[0.04] px-3.5 py-2.5">
        <p className="text-sm leading-relaxed text-panel-fg">
          {line.text}
          {line.confidence !== undefined && (
            <ConfidencePill value={line.confidence} color={agent.glow} />
          )}
        </p>
        <div className="mt-2">
          <Waveform color={agent.glow} bars={14} />
        </div>
      </div>
    </div>
  );
}

function ConfidencePill({ value, color }: { value: number; color: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const steps = 26;
    const id = window.setInterval(() => {
      frame += 1;
      setShown((value * frame) / steps);
      if (frame >= steps) window.clearInterval(id);
    }, 26);
    return () => window.clearInterval(id);
  }, [reduce, value]);

  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-pill px-2 py-0.5 align-middle font-mono text-xs font-medium tabular-nums"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {shown.toFixed(2)}
    </span>
  );
}

function YouMessage({ line }: { line: YouLine }) {
  return (
    <div className="ml-auto flex max-w-[80%] flex-col items-end gap-1.5">
      <span className="font-mono text-xs tracking-tightish text-panel-muted">
        You
      </span>
      <div className="flex items-center gap-2.5 rounded-card rounded-tr-sm border border-resolve/30 bg-resolve/[0.12] px-3.5 py-2.5">
        <Microphone
          weight="duotone"
          className="h-4 w-4 shrink-0"
          style={{ color: STATUS.mitigated.hex }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-panel-fg">{line.text}</span>
        <Waveform color={STATUS.mitigated.hex} bars={12} />
        <span className="font-mono text-xs tabular-nums text-panel-muted">
          {line.duration}
        </span>
      </div>
    </div>
  );
}

function MessageRow({ line }: { line: Line }) {
  return line.side === "you" ? (
    <YouMessage line={line} />
  ) : (
    <AgentMessage line={line} />
  );
}

function StatusChip({ mitigated }: { mitigated: boolean }) {
  const s = mitigated ? STATUS.mitigated : STATUS.degraded;
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-xs font-medium"
      animate={{ backgroundColor: `${s.hex}1f`, color: s.hex }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-live="polite"
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-pill"
        animate={{ backgroundColor: s.hex }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {s.label}
    </motion.span>
  );
}

// status flips on the orchestrator "Rolling back" line — second to last (PM closes out).
const STATUS_FLIP_INDEX = SCRIPT.length - 2;

function Panel({
  children,
  status,
}: {
  children: React.ReactNode;
  status: React.ReactNode;
}) {
  return (
    <div className="panel-grid overflow-hidden rounded-card border border-panel-line bg-panel shadow-panel">
      <header className="flex items-center justify-between gap-3 border-b border-panel-line px-4 py-3 sm:px-5">
        <span className="font-mono text-xs text-panel-muted">
          incident · checkout-service
        </span>
        {status}
      </header>
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">{children}</div>
    </div>
  );
}

export function LiveRoom() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduce) return;

    const clearAll = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const run = () => {
      clearAll();
      setCount(0);
      SCRIPT.forEach((_, i) => {
        timers.current.push(
          window.setTimeout(
            () => setCount(i + 1),
            STREAM_FIRST_DELAY + i * STREAM_STEP_DELAY,
          ),
        );
      });
      // schedule the loop restart after the last line + pause
      timers.current.push(
        window.setTimeout(
          run,
          STREAM_FIRST_DELAY + SCRIPT.length * STREAM_STEP_DELAY + LOOP_PAUSE,
        ),
      );
    };

    run();
    return clearAll;
  }, [reduce]);

  if (reduce) {
    return (
      <Panel status={<StatusChip mitigated />}>
        {SCRIPT.map((line, i) => (
          <MessageRow key={i} line={line} />
        ))}
      </Panel>
    );
  }

  const mitigated = count > STATUS_FLIP_INDEX;
  const visible = SCRIPT.slice(0, count);

  return (
    <Panel status={<StatusChip mitigated={mitigated} />}>
      <AnimatePresence initial={false}>
        {visible.map((line, i) => (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_EXPO }}
            className={line.side === "you" ? "flex" : ""}
          >
            <MessageRow line={line} />
          </motion.div>
        ))}
      </AnimatePresence>
    </Panel>
  );
}
