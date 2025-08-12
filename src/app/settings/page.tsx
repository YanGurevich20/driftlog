'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SpacesManager } from '@/components/spaces-manager';
import { AppLayout } from '@/components/app-layout';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Settings() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout title="Settings">
      <div className="space-y-8">
          <div>
            <p className="text-muted-foreground">
              Manage your spaces and account preferences
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              {user.displayName && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{user.displayName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Appearance</h3>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Theme</span>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <SpacesManager />
          </div>
        </div>
    </AppLayout>
  );
}