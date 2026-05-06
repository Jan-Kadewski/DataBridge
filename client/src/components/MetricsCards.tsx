import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function MetricsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sync-metrics'],
    queryFn: api.getSyncMetrics,
  });

  if (isLoading) {
    return <div className="text-slate-500">Loading metrics…</div>;
  }
  if (error) {
    return (
      <div className="text-red-600">
        Failed to load metrics: {error.message}
      </div>
    );
  }
  if (!data) return null;

  const tiles = [
    { label: 'Total Today', value: data.totalToday, tone: 'slate' as const },
    {
      label: 'Success Rate',
      value: `${data.successRatePct}%`,
      tone: 'green' as const,
    },
    { label: 'Errors Today', value: data.errorsToday, tone: 'red' as const },
    {
      label: 'Avg Duration',
      value:
        data.avgDurationMs === null ? '—' : `${data.avgDurationMs} ms`,
      tone: 'slate' as const,
    },
  ];

  const toneClasses: Record<string, string> = {
    slate: 'bg-white',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className={toneClasses[t.tone]}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">
              {t.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{t.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}