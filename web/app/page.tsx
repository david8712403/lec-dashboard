import { SessionWorkbench } from '@/components/SessionWorkbench';
import { WorkbenchStatus, WorkbenchView } from '@/hooks/useSessionWorkbench';

type DashboardSearchParams = {
  date?: string;
  view?: string;
  status?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialDate = resolvedSearchParams.date;
  const initialView: WorkbenchView = resolvedSearchParams.view === 'week' ? 'week' : 'today';
  const initialStatus: WorkbenchStatus = resolvedSearchParams.status === 'all' ? 'all' : 'pending';

  return (
    <SessionWorkbench
      initialDate={initialDate}
      initialView={initialView}
      initialStatus={initialStatus}
    />
  );
}
