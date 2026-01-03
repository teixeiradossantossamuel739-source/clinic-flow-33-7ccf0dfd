import { cn } from '@/lib/utils';

const LEGEND_ITEMS = [
  { status: 'available', color: 'bg-success', label: 'Livre' },
  { status: 'occupied', color: 'bg-destructive', label: 'Ocupado' },
  { status: 'pending', color: 'bg-warning', label: 'Solicitação' },
  { status: 'blocked', color: 'bg-slate-600', label: 'Bloqueado' },
];

export function SimplifiedLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="text-muted-foreground font-medium">Legenda:</span>
      {LEGEND_ITEMS.map(item => (
        <div key={item.status} className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', item.color)} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
