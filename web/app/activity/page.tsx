'use client'

import { ActivityLog } from '@/components/ActivityLog';
import { useActivities } from '@/hooks/useActivities';

export default function ActivityPage() {
  const { activities, loading: isLoading, error: loadError } = useActivities();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {loadError && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          {loadError}
        </div>
      )}
      <ActivityLog activities={activities} />
    </div>
  );
}
