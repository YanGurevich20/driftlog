'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CurrencySelector } from '@/components/currency-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function Onboarding() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(user?.displayName || '');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSubmitting(true);
    try {
      // Update user document with name and initial settings
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        email: user.email,
        name: name.trim(),
        displayName: name.trim(),
        photoUrl: user.photoUrl || null,
        displayCurrency: currency,
        connectedUserIds: [],
        createdAt: serverTimestamp(),
        onboardingCompleted: true,
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-2 flex-col">
            <CardTitle className="text-3xl">Welcome to DriftLog!</CardTitle>
            <p className="text-muted-foreground">
              Let&apos;s set up your expense tracking
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="currency">Display Currency</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-5 p-0">
                        <Info className="size-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="text-sm">
                        <p className="font-medium mb-1">About Display Currency</p>
                        <p className="text-muted-foreground">
                          All amounts will be displayed in this currency for easy tracking. 
                          You can change this anytime in settings.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <CurrencySelector
                  value={currency}
                  onChange={setCurrency}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label>Theme Preference</Label>
                <ThemeToggle />
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !name.trim()}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Setting up...' : 'Get Started'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}