import type { ReactNode } from 'react';

/** Fixed top mark — studio wordmark left, region + locale switch right.
 * `mix-blend-mode: difference` (inline, since it isn't a Tailwind utility
 * by default) keeps it legible over both the light hero image and any
 * light section beneath it while scrolling. */
export function TopMark({ studioName, region, right }: { studioName: string; region: string; right?: ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[6vw] py-[22px]"
      style={{ mixBlendMode: 'difference' }}
    >
      <span className="font-display text-[16px] font-black uppercase tracking-[0.04em] text-white">
        {studioName}
      </span>
      <span className="flex items-center gap-4 font-body text-[10px] uppercase tracking-[0.18em] text-white">
        {region}
        {right}
      </span>
    </div>
  );
}
