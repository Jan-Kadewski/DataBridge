import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

const COLORS = {
  SUCCESS: '#2E844A',
  ERROR: '#C23934',
  IN_PROGRESS: '#FFB75D',
};

export function ErrorRateChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sync-logs-chart'],
    queryFn: () => api.listSyncLog({ limit: 200 }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-500">Loading…</CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600">{error.message}</CardContent>
      </Card>
    );
  }
  if (!data) return null;

  // Aggregate counts by status from last 200 log entries.
  const counts: Record<string, number> = {
    SUCCESS: 0,
    ERROR: 0,
    IN_PROGRESS: 0,
  };
  for (const row of data.data) counts[row.status] = (counts[row.status] ?? 0) + 1;

  const chartData = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync status breakdown (recent 200)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-slate-500">No sync log entries yet.</p>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name as keyof typeof COLORS] ?? '#888'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}