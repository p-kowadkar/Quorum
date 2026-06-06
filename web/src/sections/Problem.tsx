import { Reveal } from "../components/ui/Reveal";
import { Section } from "../components/ui/Section";
import { AGENTS, AGENT_ORDER } from "../lib/theme";

const TITLE = "You're not alone at 3 a.m. anymore.";
const INTRO =
  "Today's on-call bots run a lookup table: error code → rollback or escalate. " +
  "They don't read your trace. They don't know your service. " +
  "And at 3 a.m., you're the one left deciding alone.";

const BOT_LABEL = "bot";
const BOT_SUBLABEL = "rollback? escalate?";

export function Problem() {
  return (
    <Section kicker="the shift" title={TITLE} intro={INTRO}>
      <Reveal delay={0.1}>
        <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:gap-16">
          {/* Solo bot — the old world */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card"
              aria-hidden="true"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <rect x="6" y="10" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="5" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10.5" cy="16.5" r="1.5" fill="currentColor" />
                <circle cx="17.5" cy="16.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted/60">
                {BOT_LABEL}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted/40">{BOT_SUBLABEL}</p>
            </div>
            {/* Single dim chat bubble */}
            <div className="w-44 rounded-card border border-line bg-surface px-3.5 py-2.5 opacity-40">
              <p className="font-mono text-xs text-muted">if error_rate &gt; 0.05:</p>
              <p className="font-mono text-xs text-muted/60">&nbsp;&nbsp;→ rollback</p>
            </div>
          </div>

          {/* Divider arrow */}
          <div
            className="flex items-center self-center text-muted/30 sm:pt-6"
            aria-hidden="true"
          >
            <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
              <path
                d="M0 8h32M28 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Agent room — the new world */}
          <div className="flex flex-col items-center gap-3" aria-label="Quorum agent room">
            <div className="flex gap-3">
              {AGENT_ORDER.map((key, i) => {
                const agent = AGENTS[key];
                return (
                  <Reveal key={key} delay={0.15 + i * 0.07} y={10}>
                    <div
                      className="flex h-14 w-14 flex-col items-center justify-center rounded-full border bg-surface shadow-card transition-shadow duration-200 hover:shadow-card"
                      style={{
                        borderColor: `${agent.hex}33`,
                        backgroundColor: `${agent.hex}0a`,
                      }}
                      title={agent.label}
                    >
                      <span
                        className="font-mono text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: agent.hex }}
                        aria-label={agent.label}
                      >
                        {agent.label.slice(0, 2)}
                      </span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <div className="text-center">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted/60">
                quorum
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted/40">4 specialists, one verdict</p>
            </div>
            {/* Active debate bubbles */}
            <div className="flex w-56 flex-col gap-1.5">
              {[
                { key: "rootcause" as const, text: "OOM in worker pool, hypothesis: leak in req handler" },
                { key: "coder" as const, text: "patch ready — closes the fd on early exit" },
                { key: "critic" as const, text: "reviewed. ship it." },
              ].map(({ key, text }, i) => (
                <Reveal key={key} delay={0.3 + i * 0.1} y={6}>
                  <div
                    className="rounded-card border px-3 py-2"
                    style={{
                      borderColor: `${AGENTS[key].hex}22`,
                      backgroundColor: `${AGENTS[key].hex}08`,
                    }}
                  >
                    <span
                      className="font-mono text-[10px] font-semibold"
                      style={{ color: AGENTS[key].hex }}
                    >
                      {AGENTS[key].label}
                    </span>
                    <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-muted/70">
                      {text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Bottom pull quote */}
      <Reveal delay={0.5}>
        <p className="mt-16 max-w-xl border-l-2 border-line pl-5 text-base leading-relaxed text-muted">
          Quorum maps your actual trace to the agents who know what to look for.
          They debate in your Telegram group. You read the thread, hear the verdict,
          and say yes or no. That's the whole loop.
        </p>
      </Reveal>
    </Section>
  );
}
