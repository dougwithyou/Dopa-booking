import type { LucideIcon } from 'lucide-react';
import { cardCls } from './lib/ui';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}

export default function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </div>
      <div className="mt-1.5 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
