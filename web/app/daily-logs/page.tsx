import { SessionWorkbench } from '@/components/SessionWorkbench';

export default function DailyLogsPage() {
  return (
    <SessionWorkbench
      initialView="today"
      initialStatus="all"
    />
  );
}
