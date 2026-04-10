import { SidebarNavItem } from './sidebar-nav-item';
import { useCurrentUser } from '@/hooks/use-current-user';

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<{ href: string; label: string; icon: string; disabled?: boolean; roles?: readonly string[] }>;
  isFirst?: boolean;
}

export function SidebarSection({ label, items, isFirst }: SidebarSectionProps) {
  const { data: currentUser } = useCurrentUser();
  const filteredItems = items.filter((item) => !item.roles || item.roles.includes(currentUser?.role ?? ''));

  if (filteredItems.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {!isFirst && <div className="mx-4 my-1 h-px bg-zinc-200" />}
      {!isFirst && <div className="h-1" />}
      <div className="h-7 px-3 flex items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
      </div>
      {filteredItems.map((item) => (
        <SidebarNavItem key={item.href} href={item.href} label={item.label} icon={item.icon} disabled={item.disabled} />
      ))}
    </div>
  );
}
