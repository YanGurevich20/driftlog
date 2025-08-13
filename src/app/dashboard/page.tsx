'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { EntriesList } from '@/components/entries-list';
import { MonthlyStats } from '@/components/monthly-stats';

export default function Dashboard() {
  const router = useRouter();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3 pb-20">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <EntriesList />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <MonthlyStats />
        </div>
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