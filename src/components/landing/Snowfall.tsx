// Decorative snow layer for seasonal (Christmas) landing pages. Pure CSS,
// deterministic positions so server and client render identically, and
// hidden entirely for visitors who prefer reduced motion (see globals.css).
const FLAKES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 3 + (i % 4),
  duration: 9 + ((i * 7) % 9),
  delay: -((i * 13) % 17),
  drift: i % 2 === 0 ? 1 : -1,
}));

export function Snowfall() {
  return (
    <div aria-hidden className="snowfall pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              '--drift': `${f.drift * 24}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
