'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { FocalPoint } from '@/types/db';
import { focalPosition } from './Photo';

export type HeroSlide = { url: string; focal: FocalPoint | null };

const SLIDE_MS = 6000;

/**
 * Full-bleed hero background that cycles through the page's photos like a
 * film: each slide cross-fades in while slowly zooming/panning ("Ken
 * Burns"). The outgoing slide keeps moving through its fade so there's no
 * visible jump. Motion is dropped for visitors who prefer reduced motion
 * (see .kenburns in globals.css); the cross-fade remains.
 */
export function HeroSlideshow({ slides, className }: { slides: HeroSlide[]; className?: string }) {
  const [{ active, prev }, setSlides] = useState<{ active: number; prev: number | null }>({ active: 0, prev: null });

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setSlides(({ active: current }) => ({ active: (current + 1) % slides.length, prev: current }));
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {slides.map(({ url, focal }, i) => {
        const moving = i === active || i === prev;
        return (
          <div
            key={url}
            className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
            data-active={i === active ? 'true' : undefined}
            style={{ opacity: i === active ? 1 : 0 }}
          >
            {/* Zoom toward the focal point so the subject stays in frame. */}
            <div
              className={cn('absolute inset-0', moving && (i % 2 === 0 ? 'kenburns-in' : 'kenburns-out'))}
              style={{ transformOrigin: focalPosition(focal) }}
            >
              <Image
                src={url}
                alt=""
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : 'eager'}
                sizes="100vw"
                className="fall-tone object-cover"
                style={{ objectPosition: focalPosition(focal) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
