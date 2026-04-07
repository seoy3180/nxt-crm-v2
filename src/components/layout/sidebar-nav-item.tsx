'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Contact,
  Activity,
  Building,
  Cloud,
  GraduationCap,
  Calendar,
  Code,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'users': Users,
  'file-text': FileText,
  'trending-up': TrendingUp,
  'contact': Contact,
  'activity': Activity,
  'building': Building,
  'cloud': Cloud,
  'graduation-cap': GraduationCap,
  'calendar': Calendar,
  'code': Code,
};

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

export function SidebarNavItem({ href, label, icon, disabled }: SidebarNavItemProps) {
  const pathname = usePathname();
  const dashboardPaths = ['/dashboard', '/msp', '/edu', '/dev'];
  const isActive = pathname === href || (!dashboardPaths.includes(href) && pathname.startsWith(href + '/'));

  const IconComponent = ICON_MAP[icon];

  if (disabled) {
    return (
      <span
        className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] text-muted-foreground opacity-40"
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors',
        isActive
          ? 'bg-blue-50 font-medium text-blue-600'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
      )}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}
