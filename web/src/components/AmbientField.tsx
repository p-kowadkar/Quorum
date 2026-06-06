import { useReducedMotion, motion } from "framer-motion";

// Agent hues + status tones — derived from theme.ts AGENTS, resolve-green, alert-amber
const BLOBS: {
  color: string;
  size: string;
  top: string;
  left: string;
  tx: [number, number];
  ty: [number, number];
  scale: [number, number];
  duration: number;
}[] = [
  // orchestrator blue — top-left anchor
  {
    color: "rgba(37,99,235,0.09)",
    size: "700px",
    top: "-15%",
    left: "-10%",
    tx: [0, 40],
    ty: [0, 30],
    scale: [1, 1.12],
    duration: 38,
  },
  // rootcause cyan — top-right
  {
    color: "rgba(8,145,178,0.08)",
    size: "600px",
    top: "-5%",
    left: "60%",
    tx: [0, -35],
    ty: [0, 45],
    scale: [1, 1.08],
    duration: 44,
  },
  // coder violet — mid-left
  {
    color: "rgba(124,58,237,0.08)",
    size: "650px",
    top: "35%",
    left: "-12%",
    tx: [0, 50],
    ty: [0, -30],
    scale: [1, 1.1],
    duration: 36,
  },
  // resolve green — bottom-right
  {
    color: "rgba(4,120,87,0.07)",
    size: "580px",
    top: "60%",
    left: "65%",
    tx: [0, -40],
    ty: [0, -25],
    scale: [1, 1.06],
    duration: 42,
  },
  // alert amber — far bottom-center, very faint (warm = quietest)
  {
    color: "rgba(180,83,9,0.06)",
    size: "500px",
    top: "75%",
    left: "30%",
    tx: [0, 20],
    ty: [0, -20],
    scale: [1, 1.07],
    duration: 40,
  },
];

// 14 particles scattered across the field
const DOTS: {
  size: number;
  top: string;
  left: string;
  tx: [number, number];
  ty: [number, number];
  opacity: number;
  duration: number;
  delay: number;
}[] = [
  { size: 4, top: "8%",  left: "12%", tx: [0, 12],  ty: [0, -8],  opacity: 0.18, duration: 28, delay: 0 },
  { size: 3, top: "15%", left: "78%", tx: [0, -10], ty: [0, 14],  opacity: 0.14, duration: 34, delay: 3 },
  { size: 5, top: "28%", left: "45%", tx: [0, 8],   ty: [0, -12], opacity: 0.12, duration: 30, delay: 6 },
  { size: 3, top: "42%", left: "88%", tx: [0, -14], ty: [0, 8],   opacity: 0.16, duration: 26, delay: 2 },
  { size: 4, top: "55%", left: "5%",  tx: [0, 10],  ty: [0, 10],  opacity: 0.13, duration: 32, delay: 8 },
  { size: 3, top: "62%", left: "34%", tx: [0, -8],  ty: [0, -14], opacity: 0.15, duration: 38, delay: 5 },
  { size: 5, top: "70%", left: "67%", tx: [0, 12],  ty: [0, -10], opacity: 0.11, duration: 29, delay: 1 },
  { size: 3, top: "82%", left: "22%", tx: [0, -10], ty: [0, 8],   opacity: 0.14, duration: 36, delay: 7 },
  { size: 4, top: "88%", left: "55%", tx: [0, 8],   ty: [0, 12],  opacity: 0.12, duration: 31, delay: 4 },
  { size: 3, top: "20%", left: "58%", tx: [0, -6],  ty: [0, -10], opacity: 0.13, duration: 35, delay: 9 },
  { size: 4, top: "48%", left: "72%", tx: [0, 10],  ty: [0, 6],   opacity: 0.10, duration: 27, delay: 11 },
  { size: 3, top: "35%", left: "18%", tx: [0, -8],  ty: [0, 12],  opacity: 0.14, duration: 33, delay: 10 },
  { size: 5, top: "75%", left: "90%", tx: [0, -12], ty: [0, -8],  opacity: 0.10, duration: 39, delay: 13 },
  { size: 3, top: "5%",  left: "50%", tx: [0, 6],   ty: [0, 10],  opacity: 0.12, duration: 37, delay: 12 },
];

export function AmbientField() {
  const reduced = useReducedMotion();

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Radial gradient blobs */}
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            filter: "blur(60px)",
            willChange: "transform",
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: blob.tx,
                  y: blob.ty,
                  scale: blob.scale,
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: blob.duration,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {/* Floating particles */}
      {DOTS.map((dot, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: dot.size,
            height: dot.size,
            top: dot.top,
            left: dot.left,
            borderRadius: "50%",
            backgroundColor: "rgba(37,99,235,0.35)",
            opacity: dot.opacity,
            willChange: "transform",
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: dot.tx,
                  y: dot.ty,
                }
          }
          transition={
            reduced
              ? undefined
              : {
                  duration: dot.duration,
                  delay: dot.delay,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}
