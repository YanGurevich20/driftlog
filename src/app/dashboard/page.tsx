'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EntryModal } from '@/components/entry-modal';
import { EntriesList } from '@/components/entries-list';
import { MonthlyStats } from '@/components/monthly-stats';
import { AppLayout } from '@/components/app-layout';

export default function Dashboard() {
  const { user, loading, needsOnboarding } = useAuth();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (needsOnboarding) {
        router.push('/onboarding');
      }
    }
  }, [user, loading, needsOnboarding, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name || user.displayName || 'there'}!</h2>
        <p className="text-muted-foreground">
          Track your expenses and manage your finances
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Recent Entries</h3>
            <EntriesList />
          </div>
        </div>
        
        <div>
          <MonthlyStats />
        </div>
      </div>

      <div className="fixed bottom-6 right-6">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <EntryModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          // TODO: Refresh the data
        }}
      />
    </AppLayout>
  );
}