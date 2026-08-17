import Image from 'next/image';
import { cn } from '@/lib/cn';
import { PhotoPlaceholder } from './PhotoPlaceholder';

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
}: {
  src?: string | null;
  alt: string;
  seed: number;
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
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
      />
    </div>
  );
}
