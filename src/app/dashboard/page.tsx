'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DailyView } from '@/components/daily-view';
import { MonthlyView } from '@/components/monthly-view';

export default function Dashboard() {
  const router = useRouter();

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2 pb-20">
        <DailyView />
        <MonthlyView />
      </div>

      <div className="fixed bottom-6 right-6">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => router.push('/dashboard/entry')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
}