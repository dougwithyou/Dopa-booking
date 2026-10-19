import { DEFAULT_THEME_COLORS } from '@/lib/landing/theme';
import type { TemplateOption } from '@/lib/landing/templates';

// A miniature, purely decorative sketch of the public landing page in the
// template's palette: hero photo with headline + CTA, a gallery row, and
// the closer band. Mirrors the real section order so it reads as "what
// you'll get", not just a color swatch.
export default function TemplateThumbnail({ option }: { option: TemplateOption }) {
  const c = { ...DEFAULT_THEME_COLORS, ...option.theme };
  const Icon = option.icon;

  return (
    <div
      aria-hidden
      className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-md border border-black/5"
      style={{ background: c.parchment }}
    >
      {/* Hero */}
      <div
        className="relative flex h-[52%] flex-col justify-end p-2"
        style={{ background: `linear-gradient(160deg, ${option.swatch[0]}, ${option.swatch[1]})` }}
      >
        <Icon className="absolute right-2 top-2 h-4 w-4 text-white/70" strokeWidth={1.75} />
        <div className="mb-1 h-[3px] w-1/4 rounded-full" style={{ background: c.gold }} />
        <div className="mb-1 h-[6px] w-3/4 rounded-sm bg-white/90" />
        <div className="mb-2 h-[6px] w-1/2 rounded-sm bg-white/90" />
        <div className="h-[7px] w-[38%] rounded-sm" style={{ background: c.clay }} />
      </div>

      {/* Gallery */}
      <div className="px-2 pt-2">
        <div className="mx-auto mb-1.5 h-[4px] w-1/2 rounded-sm" style={{ background: c.ink, opacity: 0.7 }} />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-[2px]"
              style={{ background: i === 1 ? c.moss : c.parchment_dim }}
            />
          ))}
        </div>
      </div>

      {/* Closer */}
      <div className="mt-auto flex flex-col items-center gap-1 p-2" style={{ background: c.wine }}>
        <div className="h-[4px] w-1/2 rounded-sm" style={{ background: c.gold }} />
        <div className="h-[6px] w-1/3 rounded-sm" style={{ background: c.clay }} />
      </div>

      {option.decoration === 'snow' && (
        <div className="pointer-events-none absolute inset-0">
          {[
            [12, 8],
            [30, 22],
            [55, 6],
            [72, 30],
            [88, 14],
            [20, 40],
            [64, 46],
            [44, 34],
          ].map(([left, top], i) => (
            <span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-white/90"
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
