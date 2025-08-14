'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SpacesManager } from '@/components/spaces-manager';
import { ThemeToggle } from '@/components/theme-toggle';
import { CurrencySelector } from '@/components/currency-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const router = useRouter();
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!user || newCurrency === user.preferredCurrency) return;
    
    setIsUpdatingCurrency(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        preferredCurrency: newCurrency
      });
      toast.success('Preferred currency updated');
    } catch (error) {
      console.error('Error updating currency:', error);
      toast.error('Failed to update currency');
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-muted-foreground">Preferred Currency</span>
                  <p className="text-xs text-muted-foreground mt-1">Default currency for new spaces</p>
                </div>
                <CurrencySelector
                  value={user.preferredCurrency}
                  onChange={handleCurrencyChange}
                  disabled={isUpdatingCurrency}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium">Theme</span>
                <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <SpacesManager />
          </CardContent>
        </Card>
      </div>
    </>
  );
}