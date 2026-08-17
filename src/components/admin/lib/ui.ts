// Shared Tailwind class strings for the admin panel. Keeps a consistent,
// neutral look (grays + one accent) across every CRUD screen without
// pulling in a component library.

export const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100 disabled:text-gray-500';

export const textareaCls = inputCls + ' resize-y';

export const selectCls = inputCls;

export const labelCls = 'mb-1 block text-xs font-medium text-gray-600';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';

export const cardCls = 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm';

export const tableWrapCls = 'overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm';

export const thCls = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';

export const tdCls = 'whitespace-nowrap px-4 py-2.5 text-sm text-gray-800';

export const badgeCls = (tone: 'gray' | 'green' | 'amber' | 'red' | 'blue' = 'gray') => {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`;
};
