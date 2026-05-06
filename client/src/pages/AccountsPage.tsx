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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountForm } from '@/components/AccountForm';
import { api, type Account } from '@/lib/api';

function SyncStatusBadge({ status }: { status: Account['syncStatus'] }) {
  const variants: Record<Account['syncStatus'], string> = {
    pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    synced: 'bg-green-100 text-green-800 hover:bg-green-100',
    error: 'bg-red-100 text-red-800 hover:bg-red-100',
  };
  return <Badge className={variants[status]}>{status}</Badge>;
}

export default function AccountsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.listAccounts({ limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Accounts</h2>
          <p className="text-slate-600">
            Legacy system accounts. Creating one here triggers the webhook to Salesforce.
          </p>
        </div>
        <AccountForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {data ? `${data.total} account(s)` : 'Accounts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-slate-500">Loading…</p>}
          {error && <p className="text-red-600">Error: {error.message}</p>}
          {data && data.data.length === 0 && (
            <p className="text-slate-500">No accounts yet.</p>
          )}
          {data && data.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Billing City</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>External ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>{acc.industry ?? '—'}</TableCell>
                    <TableCell>{acc.billingCity ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">
                      {acc.annualRevenue === null
                        ? '—'
                        : acc.annualRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={acc.syncStatus} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {acc.externalId
                        ? acc.externalId.slice(0, 10) + '…'
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}