'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-secondary p-4 rounded-full">
            <Wallet className="w-12 h-12 text-secondary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">DriftLog</h1>
          <p className="text-muted-foreground text-lg">
            Track expenses across currencies for digital nomads
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <Button
            onClick={async () => {
              setIsSigningIn(true);
              try {
                await signInWithGoogle();
              } catch (error) {
                setIsSigningIn(false);
              }
            }}
            size="lg"
            className="w-full"
            variant="default"
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}