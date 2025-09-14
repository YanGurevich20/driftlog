'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRef, useState, useEffect as useReactEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { EntriesCacheProvider } from '@/lib/entries-cache';
import { EntryAnimationProvider } from '@/contexts/entry-animation-context';
import { LoadingLogo } from '@/components/ui/loading-logo';

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
    return <LoadingLogo />;
  }

  if (!user) {
    return <LoadingLogo />;
  }

  return (
    <EntriesCacheProvider>
      <EntryAnimationProvider>
        <AppLayout>{children}</AppLayout>
      </EntryAnimationProvider>
    </EntriesCacheProvider>
  );
}