import { MetricsCards } from '@/components/MetricsCards';
import { ErrorRateChart } from '@/components/ErrorRateChart';
import { SyncLogTable } from '@/components/SyncLogTable';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-600">
          Live sync operations from the external system perspective. Updates every 5s.
        </p>
      </div>

      <MetricsCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SyncLogTable />
        </div>
        <div>
          <ErrorRateChart />
        </div>
      </div>
    </div>
  );
}