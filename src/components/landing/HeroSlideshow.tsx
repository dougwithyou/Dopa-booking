'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

const SLIDE_MS = 6000;

/**
 * Full-bleed hero background that cycles through the page's photos like a
 * film: each slide cross-fades in while slowly zooming/panning ("Ken
 * Burns"). The outgoing slide keeps moving through its fade so there's no
 * visible jump. Motion is dropped for visitors who prefer reduced motion
 * (see .kenburns in globals.css); the cross-fade remains.
 */
export function HeroSlideshow({ urls, className }: { urls: string[]; className?: string }) {
  const [{ active, prev }, setSlides] = useState<{ active: number; prev: number | null }>({ active: 0, prev: null });

  useEffect(() => {
    if (urls.length < 2) return;
    const id = window.setInterval(() => {
      setSlides(({ active: current }) => ({ active: (current + 1) % urls.length, prev: current }));
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [urls.length]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {urls.map((url, i) => {
        const moving = i === active || i === prev;
        return (
          <div
            key={url}
            className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
            style={{ opacity: i === active ? 1 : 0 }}
          >
            <div className={cn('absolute inset-0', moving && (i % 2 === 0 ? 'kenburns-in' : 'kenburns-out'))}>
              <Image
                src={url}
                alt=""
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : 'eager'}
                sizes="100vw"
                className="fall-tone object-cover"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
