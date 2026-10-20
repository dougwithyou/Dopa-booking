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
export function BackgroundMusic({
  src,
  playLabel,
  muteLabel,
  hintLabel,
}: {
  src: string;
  playLabel: string;
  muteLabel: string;
  hintLabel: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  // Shown while the browser is still blocking autoplay (and the visitor
  // hasn't muted on purpose), nudging them to tap.
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    if (readMuted()) return;
    setWaiting(true);

    const start = (e?: Event) => {
      // The button handles its own clicks; don't start-then-toggle-off.
      if (e && buttonRef.current?.contains(e.target as Node)) return;
      audio.play().then(() => {
        setPlaying(true);
        setWaiting(false);
        detach();
      }).catch(() => {
        // Still blocked; wait for the next interaction.
      });
    };
    // Browsers only allow sound after a "user activation" — a tap, click or
    // key press (a scroll swipe alone doesn't count). Listen for all of them
    // so the music starts on the visitor's very first one.
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
    const detach = () => events.forEach((ev) => window.removeEventListener(ev, start));
    events.forEach((ev) => window.addEventListener(ev, start, { passive: true }));
    start();
    return detach;
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    setWaiting(false);
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
      {/* preload so the first allowed play() starts instantly */}
      <audio ref={audioRef} src={src} loop preload="auto" />
      {waiting && !playing && (
        <span className="pointer-events-none fixed bottom-[30px] right-[76px] z-[60] animate-pulse whitespace-nowrap bg-wine/90 px-3 py-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-parchment shadow">
          {hintLabel}
        </span>
      )}
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
