'use client';

import { useEffect, useRef, useState } from 'react';
import { Music, VolumeX } from 'lucide-react';

const MUTED_KEY = 'dopa-music-muted';

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {
    // Storage blocked (private mode etc.) — the toggle still works for this visit.
  }
}

/**
 * Looping background track with a floating mute/unmute button. Browsers
 * block audible autoplay, so after an optimistic play() attempt the track
 * starts on the visitor's first tap/click/key anywhere on the page — unless
 * they muted it on a previous visit.
 */
export function BackgroundMusic({ src, playLabel, muteLabel }: { src: string; playLabel: string; muteLabel: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    if (readMuted()) return;

    const start = (e?: Event) => {
      // The button handles its own clicks; don't start-then-toggle-off.
      if (e && buttonRef.current?.contains(e.target as Node)) return;
      audio.play().then(() => {
        setPlaying(true);
        detach();
      }).catch(() => {
        // Still blocked; wait for the next interaction.
      });
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const detach = () => events.forEach((ev) => window.removeEventListener(ev, start));
    events.forEach((ev) => window.addEventListener(ev, start, { passive: true }));
    start();
    return detach;
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      writeMuted(true);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      writeMuted(false);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={playing ? muteLabel : playLabel}
        title={playing ? muteLabel : playLabel}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-wine text-parchment shadow-lg ring-1 ring-gold/40 transition hover:scale-105"
      >
        {playing ? (
          <Music className="h-5 w-5 animate-pulse" strokeWidth={1.75} />
        ) : (
          <VolumeX className="h-5 w-5" strokeWidth={1.75} />
        )}
      </button>
    </>
  );
}
