'use client';

import { useAuth } from '@/lib/auth-context';
import { REGISTRATIONS_CLOSED } from '@/lib/config';
import WaitlistForm from '@/components/waitlist-form';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/loading-state';

export default function Home() {
  const { user, loading, signInWithGoogle, needsOnboarding } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (needsOnboarding) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingState variant="card" className="w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg p-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="bg-secondary p-4 rounded-full">
              <Wallet className="size-12 text-secondary-foreground" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">DriftLog</h1>
            <p className="text-muted-foreground text-lg">
              Track expenses across currencies for digital nomads
            </p>
          </div>

          <div className="space-y-4 pt-8">
            {REGISTRATIONS_CLOSED ? (
              <WaitlistForm />
            ) : (
              <>
                <Button
                  onClick={async () => {
                    setIsSigningIn(true);
                    try {
                      await signInWithGoogle();
                    } catch {
                      setIsSigningIn(false);
                    }
                  }}
                  size="lg"
                  className="w-full"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By signing in, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-foreground">
                    ToS
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}