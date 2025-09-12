'use client';

import { AuthProvider } from './auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeRippleProvider } from '@/components/theme-ripple-provider';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
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
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
      <ThemeRippleProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeRippleProvider>
    </ThemeProvider>
  );
}