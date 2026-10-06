'use client';

import { Check } from 'lucide-react';
import { TEMPLATE_OPTIONS } from '@/lib/landing/templates';

export default function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TEMPLATE_OPTIONS.map((opt) => {
        const selected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative overflow-hidden rounded-lg border p-3 text-left transition ${
              selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div
              className="mb-2 flex h-14 items-center justify-center rounded-md"
              style={{ background: `linear-gradient(135deg, ${opt.swatch[0]}, ${opt.swatch[1]})` }}
            >
              <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-xs font-medium text-gray-800">{opt.label}</span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 rounded-full bg-gray-900 p-0.5">
                <Check className="h-3 w-3 text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
