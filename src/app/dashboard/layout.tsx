'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { EntriesCacheProvider } from '@/lib/entries-cache';
import { EntryAnimationProvider } from '@/contexts/entry-animation-context';
import { Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (needsOnboarding) {
        router.push('/onboarding');
      }
    }
  }, [user, loading, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-secondary p-4 rounded-full animate-pulse">
            <Wallet className="size-8 text-secondary-foreground" />
          </div>
          <div className="text-muted-foreground animate-pulse">Preparing your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-secondary p-4 rounded-full animate-pulse">
            <Wallet className="size-8 text-secondary-foreground" />
          </div>
          <div className="text-muted-foreground animate-pulse">Redirecting...</div>
        </div>
      </div>
    );
  }

  return (
    <EntriesCacheProvider>
      <EntryAnimationProvider>
        <AppLayout>{children}</AppLayout>
      </EntryAnimationProvider>
    </EntriesCacheProvider>
  );
}