'use client';

import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import Link from 'next/link';
import { ConnectedUsers, ConnectedUsersInviteButton, ConnectedUsersLeaveButton } from '@/components/connected-users';
import { ThemeToggle } from '@/components/theme-toggle';
import { CurrencySelector } from '@/components/currency-selector';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, LogOut } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { user, logout } = useAuth();
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!user || newCurrency === user.displayCurrency) return;
    
    setIsUpdatingCurrency(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        displayCurrency: newCurrency
      });
      toast.success('Display currency updated');
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
            asChild
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="space-y-8">
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Account</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSignOutDialogOpen(true)}>
                <LogOut />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <UserAvatar user={user}/>
              <div className="space-y-1">
                {user.displayName && (
                  <div className="font-medium">{user.displayName}</div>
                )}
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">Theme</span>
                  <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">Display Currency</span>
                  <p className="text-xs text-muted-foreground">All amounts will be shown in this currency</p>
                </div>
                <CurrencySelector
                  value={user.displayCurrency}
                  onChange={handleCurrencyChange}
                  disabled={isUpdatingCurrency}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Connected Users</CardTitle>
              <div className="flex items-center gap-3">
                <ConnectedUsersInviteButton />
                <ConnectedUsersLeaveButton />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectedUsers />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You&apos;ll need to sign in again to access your expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}