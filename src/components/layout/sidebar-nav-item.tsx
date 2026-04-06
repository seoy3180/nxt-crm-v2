'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  FileText,
  TrendingUp,
  Contact,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'layout-dashboard': LayoutDashboard,
  'building-2': Building2,
  'file-text': FileText,
  'trending-up': TrendingUp,
  'contact': Contact,
};

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: string;
}

export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && href !== '/msp' && href !== '/edu' && href !== '/dev' && pathname.startsWith(href + '/'));

  const IconComponent = ICON_MAP[icon];

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent/10 font-medium text-accent'
          : 'text-muted-foreground hover:bg-accent/5 hover:text-foreground',
      )}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}
