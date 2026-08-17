'use client';

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

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-5">
        <span className="text-lg font-semibold tracking-tight text-gray-900">Dopa Studio</span>
        <div className="text-xs text-gray-500">Admin</div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
