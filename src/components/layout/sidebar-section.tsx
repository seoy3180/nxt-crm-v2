import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<{ href: string; label: string; icon: string }>;
}

export function SidebarSection({ label, items }: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      <Separator className="my-2" />
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.map((item) => (
        <SidebarNavItem key={item.href} {...item} />
      ))}
    </div>
  );
}
