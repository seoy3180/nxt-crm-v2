import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<{ href: string; label: string; icon: string; disabled?: boolean }>;
  isFirst?: boolean;
}

export function SidebarSection({ label, items, isFirst }: SidebarSectionProps) {
  return (
    <div className="space-y-0.5">
      {!isFirst && <div className="mx-4 my-1 h-px bg-zinc-200" />}
      {!isFirst && <div className="h-1" />}
      <div className="h-7 px-3 flex items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
      </div>
      {items.map((item) => (
        <SidebarNavItem key={item.href} {...item} />
      ))}
    </div>
  );
}
