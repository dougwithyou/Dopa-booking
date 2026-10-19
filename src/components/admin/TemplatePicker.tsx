'use client';

import { Check } from 'lucide-react';
import { TEMPLATE_OPTIONS } from '@/lib/landing/templates';
import TemplateThumbnail from './TemplateThumbnail';

export default function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TEMPLATE_OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`relative overflow-hidden rounded-lg border p-2 text-left transition ${
              selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <TemplateThumbnail option={opt} />
            <span className="mt-2 block text-xs font-medium text-gray-800">{opt.label}</span>
            {selected && (
              <span className="absolute right-1 top-1 rounded-full bg-gray-900 p-0.5">
                <Check className="h-3 w-3 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
