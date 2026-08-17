'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { UploadCloud, X } from 'lucide-react';
import { getCroppedImageBlob } from './lib/cropImage';
import { btnPrimary, btnSecondary } from './lib/ui';

interface ImageUploadCropProps {
  /** 16 / 9 for hero images, 1 for gallery/product thumbnails. */
  aspect: number;
  /** Called with the cropped JPEG blob once the admin confirms the crop. */
  onCropped: (blob: Blob) => void | Promise<void>;
  label?: string;
  outputWidth?: number;
  uploading?: boolean;
}

export default function ImageUploadCrop({
  aspect,
  onCropped,
  label = 'Upload image',
  outputWidth = 1600,
  uploading = false,
}: ImageUploadCropProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => setImageSrc(reader.result as string));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputWidth);
    await onCropped(blob);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleCancel() {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  if (!imageSrc) {
    return (
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          className={btnSecondary}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-4 w-4" />
          {uploading ? 'Uploading…' : label}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Crop image ({aspect === 1 ? '1:1' : '16:9'})</h3>
          <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative h-72 w-full overflow-hidden rounded-md bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-3 w-full"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} disabled={uploading} onClick={handleConfirm}>
            {uploading ? 'Uploading…' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
