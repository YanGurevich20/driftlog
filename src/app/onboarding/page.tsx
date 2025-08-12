'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SpacesService } from '@/services/spaces';
import { CurrencySelector } from '@/components/currency-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function Onboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(user?.displayName || '');
  const [currency, setCurrency] = useState('USD');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSubmitting(true);
    try {
      // Create the user's main space
      const spaceId = await SpacesService.createSpace(
        user.id,
        name,
        `${name}'s Space`,
        currency
      );

      // Update user document with name and main space
      await setDoc(doc(db, 'users', user.id), {
        id: user.id,
        email: user.email,
        name: name.trim(),
        displayName: name.trim(),
        photoUrl: user.photoUrl || null,
        mainCurrency: currency,
        defaultSpaceId: spaceId,
        createdAt: serverTimestamp(),
        onboardingCompleted: true,
      });

      // The auth context will automatically update via the real-time listener
      // and redirect to dashboard when onboardingCompleted is detected
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to DriftLog!</h1>
            <p className="text-muted-foreground">
              Let&apos;s set up your expense tracking
            </p>
          </div>

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

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="currency">Main Currency</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="text-sm">
                      <p className="font-medium mb-1">About Main Currency</p>
                      <p className="text-muted-foreground">
                        All your expenses will be converted to this currency for easy tracking. 
                        We recommend choosing the currency you earn income in or use most frequently.
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

            <div className="space-y-2">
              <Label>Theme Preference</Label>
              <ThemeToggle />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Setting up...' : 'Get Started'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}