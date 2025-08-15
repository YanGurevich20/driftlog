'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold hover:opacity-80">
            DriftLog
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}