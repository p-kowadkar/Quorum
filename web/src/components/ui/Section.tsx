import type { ReactNode } from "react";

import { Container } from "./Container";

export function Section({
  id,
  kicker,
  title,
  intro,
  children,
  className = "",
}: {
  id?: string;
  kicker?: string;
  title?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 py-24 sm:py-32 ${className}`}>
      <Container>
        {(kicker || title || intro) && (
          <div className="mb-14 max-w-2xl">
            {kicker && (
              <div className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-muted">
                {kicker}
              </div>
            )}
            {title && (
              <h2 className="font-display text-3xl font-semibold leading-[1.08] tracking-tightish text-fg sm:text-[2.6rem]">
                {title}
              </h2>
            )}
            {intro && (
              <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
