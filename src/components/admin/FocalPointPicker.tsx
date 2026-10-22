'use client';

import { useState } from 'react';
import type { FocalPoint } from '@/types/db';
import { btnPrimary, btnSecondary } from './lib/ui';

const PREVIEWS = [
  { label: 'Desktop', aspect: '16 / 9', width: 'w-40' },
  { label: 'Phone', aspect: '9 / 16', width: 'w-[4.5rem]' },
  { label: 'Square', aspect: '1 / 1', width: 'w-24' },
];

/**
 * Modal to mark a photo's focal point: the full, uncropped photo is shown
 * and a tap/click sets the point to keep in frame. Live previews show how
 * the page will frame it on desktop, phone and in the square gallery grid.
 */
export default function FocalPointPicker({
  imageUrl,
  value,
  onSave,
  onClose,
}: {
  imageUrl: string;
  value: FocalPoint;
  onSave: (point: FocalPoint) => void;
  onClose: () => void;
}) {
  const [point, setPoint] = useState<FocalPoint>(value);
  const position = `${point.x}% ${point.y}%`;

  function pick(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const round = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    setPoint({
      x: round(((e.clientX - rect.left) / rect.width) * 100),
      y: round(((e.clientY - rect.top) / rect.height) * 100),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-4 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Set the center of the photo</h3>
          <p className="text-xs text-gray-500">
            Tap the part that must always stay visible (e.g. the faces). The photo isn&apos;t cropped — it&apos;s framed
            around this point on each screen size.
          </p>
        </div>

        <div className="flex justify-center rounded-md bg-gray-100">
          <div className="relative inline-block cursor-crosshair touch-none select-none" onPointerDown={pick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" draggable={false} className="block max-h-[50vh] w-auto max-w-full" />
            <span
              className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {PREVIEWS.map((p) => (
            <div key={p.label} className="text-center">
              <div className={`${p.width} overflow-hidden rounded border border-gray-200`} style={{ aspectRatio: p.aspect }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: position }} />
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{p.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={() => setPoint({ x: 50, y: 50 })}>
            Reset to center
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              onSave(point);
              onClose();
            }}
          >
            Save center
          </button>
        </div>
      </div>
    </div>
  );
}
