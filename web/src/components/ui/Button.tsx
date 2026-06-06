import type { ReactNode } from "react";

type Variant = "primary" | "ghost";

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-sm font-medium tracking-tightish transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";
  const variants: Record<Variant, string> = {
    primary:
      "bg-resolve text-white shadow-card hover:-translate-y-0.5 hover:brightness-110",
    ghost:
      "border border-line bg-surface text-fg hover:-translate-y-0.5 hover:border-fg/25",
  };
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
