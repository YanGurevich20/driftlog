'use client';

import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toUTCMidnight } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { toast } from 'sonner';

interface LLMEntryDebugProps {
  inputText: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
  clearForm: () => void;
}

export function LLMEntryDebug({ 
  inputText, 
  isLoading, 
  setIsLoading, 
  onDateChange, 
  onEntryCreated, 
  clearForm 
}: LLMEntryDebugProps) {
  const { user } = useAuth();

  const handleDebugSubmit = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      // Create a mock entry for testing
      const mockEntry = {
        type: 'expense' as const,
        amount: Math.floor(Math.random() * 100) + 10, // Random amount between 10-110
        currency: 'USD',
        category: ['Food & Dining', 'Transportation', 'Entertainment', 'Shopping'][Math.floor(Math.random() * 4)],
        description: inputText.trim() || `Debug entry ${new Date().toLocaleTimeString()}`,
        date: new Date().toISOString(),
        confidence: 0.9
      };

      const entryData = {
        type: mockEntry.type,
        userId: user.id,
        originalAmount: mockEntry.amount,
        currency: mockEntry.currency,
        category: mockEntry.category,
        description: mockEntry.description,
        date: toUTCMidnight(new Date(mockEntry.date)),
        createdBy: user.id,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'entries'), entryData);
      
      const entryDate = new Date(mockEntry.date);
      
      // Automatically navigate to the entry date
      onDateChange?.(entryDate);
      
      // Trigger flash animation for the new entry
      onEntryCreated?.(docRef.id);
      
      // Clear the form
      clearForm();
    } catch (error) {
      console.error('Error creating debug entry:', error);
      toast.error('Failed to create debug entry');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleDebugSubmit}
      disabled={isLoading}
      title="Create debug entry (no AI)"
    >
      <Bug />
    </Button>
  );
}