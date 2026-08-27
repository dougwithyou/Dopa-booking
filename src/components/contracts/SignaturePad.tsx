'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { cn } from '@/lib/cn';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  getDataUrl: () => string | null;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string }>(function SignaturePad(
  { className },
  ref
) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const [empty, setEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    getDataUrl: () => {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return null;
      // getTrimmedCanvas crops surrounding whitespace so the signature isn't
      // a tiny mark in the middle of a mostly-blank image on the PDF.
      return pad.getTrimmedCanvas().toDataURL('image/png');
    },
    clear: () => {
      padRef.current?.clear();
      setEmpty(true);
    },
  }));

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-ink/20 bg-white', className)}>
      <SignatureCanvas
        ref={(el) => {
          padRef.current = el;
        }}
        penColor="#221c17"
        canvasProps={{ className: 'h-40 w-full touch-none' }}
        onEnd={() => setEmpty(padRef.current?.isEmpty() ?? true)}
      />
      {empty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-body text-sm text-ink/30">
          Sign here
        </span>
      )}
    </div>
  );
});
