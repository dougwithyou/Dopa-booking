'use client';

import { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { btnSecondary } from './lib/ui';

const MAX_SIDE = 2400;

/**
 * Uploads the whole photo — no cropping. Large photos are only scaled down
 * (longest side 2400px, JPEG) so the page stays fast; the framing is set
 * afterwards with a focal point (FocalPointPicker).
 */
async function downscale(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.88)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImageUploadFull({
  label,
  uploading,
  onUpload,
}: {
  label: string;
  uploading: boolean;
  onUpload: (blob: Blob) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) await onUpload(await downscale(file));
        }}
      />
      <button type="button" className={btnSecondary} disabled={uploading} onClick={() => inputRef.current?.click()}>
        <UploadCloud className="h-4 w-4" />
        {uploading ? 'Uploading…' : label}
      </button>
    </div>
  );
}
