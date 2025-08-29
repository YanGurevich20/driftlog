'use client';

import { Button } from '@/components/ui/button';
import { Settings, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CurrencyService } from '@/services/currency';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/user-avatar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isSettingsPage = pathname?.includes('/settings');
  const { user } = useAuth();

  useEffect(() => {
    const currencyService = CurrencyService.getInstance();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    
    currencyService.getMonthlyRates([currentMonth]).catch(err => {
      console.error('Failed to pre-fetch exchange rates:', err);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold hover:opacity-80">
            DriftLog
          </Link>
          <div className="flex items-center gap-2">
            {user && <UserAvatar user={user}/>}
            <Link href={isSettingsPage ? "/dashboard" : "/dashboard/settings"}>
              <Button variant="ghost" size="icon">
                {isSettingsPage ? <Home /> : <Settings />}
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 flex-1">
        {children}
      </main>
      
      {isSettingsPage && (
        <footer>
          <div className="py-2 text-center text-xs text-muted-foreground">
            © 2025 DriftLog • All rights reserved •{' '}
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>{' '}
            •{' '}
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}