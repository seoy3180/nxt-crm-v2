interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  changeColor?: string;
}

export function KpiCard({ label, value, change, changeColor = 'text-zinc-500' }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5">
      <span className="text-[13px] font-medium text-zinc-500">{label}</span>
      <span className="text-[32px] font-bold leading-none text-zinc-900">{value}</span>
      <span className={`text-xs ${changeColor}`}>{change}</span>
    </div>
  );
}
