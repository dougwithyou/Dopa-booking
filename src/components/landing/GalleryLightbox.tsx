'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Photo } from './Photo';
import { Reveal } from './Reveal';

export interface GalleryPhotoItem {
  url: string | null;
  tag: string;
}

export function GalleryLightbox({
  sectionId,
  eyebrow,
  heading,
  photos,
  closeLabel,
  prevLabel,
  nextLabel,
}: {
  sectionId: string;
  eyebrow: string | null;
  heading: ReactNode;
  photos: GalleryPhotoItem[];
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [sliding, setSliding] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const step = useCallback(
    (delta: 1 | -1) => {
      if (photos.length === 0) return;
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + delta + photos.length) % photos.length;
      });
      setDir(delta);
      setSliding(false);
      requestAnimationFrame(() => setSliding(true));
    },
    [photos.length]
  );

  const close = useCallback(() => setOpenIndex(null), []);

  useEffect(() => {
    if (openIndex === null) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [openIndex, close, step]);

  if (photos.length === 0) return null;

  const activePhoto = openIndex !== null ? photos[openIndex] : null;

  return (
    <section className="bg-parchment px-[6vw] py-[120px] max-[600px]:py-20" id={sectionId}>
      <Reveal className="mb-14 max-w-[640px]">
        {eyebrow && (
          <span className="mb-3.5 block font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-[clamp(30px,4vw,48px)] font-black leading-[1.1] text-ink">{heading}</h2>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setOpenIndex(i);
                setDir(1);
                setSliding(false);
                requestAnimationFrame(() => setSliding(true));
              }}
              className="group relative aspect-square cursor-pointer overflow-hidden text-left"
            >
              <Photo
                src={photo.url}
                alt={photo.tag}
                seed={i + 1}
                className="h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
              />
              <span
                className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,15,12,0) 55%, rgba(20,15,12,0.55) 100%)',
                }}
              />
              {photo.tag && (
                <span className="absolute bottom-3.5 left-3.5 z-[2] font-body text-[10px] uppercase tracking-[0.16em] text-parchment opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {photo.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Lightbox */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center px-[6vw] py-[8vh] transition-opacity duration-300"
        style={{
          background: 'rgba(17,13,10,0.94)',
          opacity: openIndex !== null ? 1 : 0,
          visibility: openIndex !== null ? 'visible' : 'hidden',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(diff) > 40) step(diff < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          className="absolute right-[6vw] top-[26px] flex h-[42px] w-[42px] items-center justify-center border border-parchment/40 text-2xl leading-none text-parchment transition-[border-color,transform] duration-300 hover:rotate-90 hover:border-parchment"
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={prevLabel}
          className="absolute left-[4vw] top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center border border-parchment/35 bg-parchment/[0.06] text-[22px] text-parchment transition-colors duration-300 hover:border-parchment hover:bg-parchment/[0.14] max-[640px]:left-[3vw] max-[640px]:h-[38px] max-[640px]:w-[38px] max-[640px]:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={nextLabel}
          className="absolute right-[4vw] top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center border border-parchment/35 bg-parchment/[0.06] text-[22px] text-parchment transition-colors duration-300 hover:border-parchment hover:bg-parchment/[0.14] max-[640px]:right-[3vw] max-[640px]:h-[38px] max-[640px]:w-[38px] max-[640px]:text-lg"
        >
          ›
        </button>

        {activePhoto && (
          <div
            key={openIndex}
            className="relative aspect-[4/5] w-[min(560px,100%)] scale-100"
            style={
              sliding
                ? ({ '--sdir': dir === -1 ? '-20px' : '20px', animation: 'slidein 0.35s ease' } as CSSProperties)
                : undefined
            }
          >
            <Photo src={activePhoto.url} alt={activePhoto.tag} seed={(openIndex ?? 0) + 1} className="h-full w-full" />
            {activePhoto.tag && (
              <span className="absolute -bottom-[34px] left-0 font-body text-[11px] uppercase tracking-[0.16em] text-parchment">
                {activePhoto.tag}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
