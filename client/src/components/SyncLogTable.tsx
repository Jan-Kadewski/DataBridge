import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, type SyncLogEntry } from '@/lib/api';

function StatusBadge({ status }: { status: SyncLogEntry['status'] }) {
  const variants: Record<SyncLogEntry['status'], string> = {
    SUCCESS: 'bg-green-100 text-green-800 hover:bg-green-100',
    ERROR: 'bg-red-100 text-red-800 hover:bg-red-100',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  };
  return <Badge className={variants[status]}>{status}</Badge>;
}

export function SyncLogTable() {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sync-logs', filter],
    queryFn: () =>
      api.listSyncLog({
        limit: 50,
        correlationId: filter ?? undefined,
      }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent operations</CardTitle>
        {filter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter(null)}
          >
            Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {filter && (
          <p className="mb-3 text-sm text-slate-500">
            Filtered by correlation ID: <code className="font-mono">{filter}</code>
          </p>
        )}
        {isLoading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="text-red-600">Failed to load: {error.message}</p>
        )}
        {data && data.data.length === 0 && (
          <p className="text-slate-500">No entries.</p>
        )}
        {data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Dir.</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Correlation ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(row.createdAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="font-medium">{row.operation}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.direction}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.objectName ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-mono text-xs text-blue-600 hover:underline"
                      onClick={() => setFilter(row.correlationId)}
                      title="Filter by this correlation ID"
                    >
                      {row.correlationId.slice(0, 8)}…
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}