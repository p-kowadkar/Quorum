// Small voice-note waveform. Bars animate via the `wf` keyframe (index.css);
// when inactive they sit static and low. Reduced-motion is handled in CSS.

const HEIGHTS = [9, 14, 7, 18, 11, 16, 8, 13, 19, 10, 15, 7, 17, 12, 9, 14, 8, 16];

export function Waveform({
  color = "currentColor",
  bars = 18,
  active = true,
}: {
  color?: string;
  bars?: number;
  active?: boolean;
}) {
  const count = Math.max(1, bars);

  return (
    <span
      className="inline-flex h-4 items-center gap-[2px]"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => {
        const h = HEIGHTS[i % HEIGHTS.length];
        return (
          <span
            key={i}
            className="wf-bar w-[2px] rounded-pill"
            style={{
              height: active ? h : 4,
              backgroundColor: color,
              animationDelay: `${i * 0.06}s`,
              ...(active ? {} : { animation: "none", transform: "scaleY(0.5)" }),
            }}
          />
        );
      })}
    </span>
  );
}
