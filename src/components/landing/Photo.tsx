import Image from 'next/image';
import { cn } from '@/lib/cn';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import type { FocalPoint } from '@/types/db';

/** CSS object-position for a focal point (centered when unset). */
export function focalPosition(focal?: FocalPoint | null): string {
  const clamp = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 50));
  return focal ? `${clamp(focal.x)}% ${clamp(focal.y)}%` : '50% 50%';
}

/**
 * A single photo slot: renders a real image (with the brand's fall-toned
 * filter) when a URL is present, otherwise falls back to the gradient
 * placeholder so the layout still reads as finished before an admin has
 * uploaded real photos.
 */
export function Photo({
  src,
  alt,
  seed,
  label,
  className,
  priority,
  sizes,
  focal,
}: {
  src?: string | null;
  alt: string;
  seed: number;
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Part of the photo to keep in frame when object-cover crops it. */
  focal?: FocalPoint | null;
}) {
  if (!src) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <PhotoPlaceholder seed={seed} label={label} />
      </div>
    );
  }
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? '(max-width: 700px) 50vw, 33vw'}
        className="fall-tone object-cover"
        style={{ objectPosition: focalPosition(focal) }}
      />
    </div>
  );
}
