'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  FileText,
  Tag,
  Package,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import SignOutButton from './SignOutButton';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/landing-pages', label: 'Landing Pages', icon: FileText },
  { href: '/admin/discount-codes', label: 'Discount Codes', icon: Tag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/crm', label: 'CRM', icon: Users },
  { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — only visible below md, sits in normal flow above <main>. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <span className="text-base font-semibold tracking-tight text-gray-900">Dopa Studio</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop, mobile only, closes the drawer on tap. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* The nav itself: a slide-in drawer on mobile (position: fixed, so it
          drops out of the flex flow entirely), a normal static column on
          desktop (md:static puts it back in flow next to <main>). */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5">
          <div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">Dopa Studio</span>
            <div className="text-xs text-gray-500">Admin</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-2 truncate text-xs text-gray-500" title={userEmail}>
            {userEmail}
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
