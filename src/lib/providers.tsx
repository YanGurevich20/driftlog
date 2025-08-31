'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchInterval: 30 * 1000,
          },
        },
      })
  );

  useEffect(() => {
    let reloadScheduled = false;

    const scheduleReload = () => {
      if (!reloadScheduled) {
        reloadScheduled = true;
        setTimeout(() => window.location.reload(), 100);
      }
    };

    const handleChunkError = (event: ErrorEvent) => {
      const target = event.target as HTMLScriptElement;
      if (target?.tagName === 'SCRIPT' && target.src && 
          (target.src.includes('_next/static/chunks/') || 
           event.message?.includes('ChunkLoadError'))) {
        console.warn('Chunk loading failed, reloading page:', target.src);
        scheduleReload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'ChunkLoadError' || 
          event.reason?.message?.includes('Loading chunk')) {
        console.warn('Chunk loading failed (promise), reloading page');
        scheduleReload();
      }
    };

    window.addEventListener('error', handleChunkError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleChunkError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}