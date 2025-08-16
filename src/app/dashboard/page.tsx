'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DailyView } from '@/components/daily-view';
import { MonthlyView } from '@/components/monthly-view';
import { BudgetView } from '@/components/budget-view';
import { useAuth } from '@/lib/auth-context';

const greetings = [
  "Welcome back",
  "Good to see you",
  "Hey there",
  "Hello",
  "Greetings",
  "Howdy",
  "Nice to see you",
  "Looking good",
  "Ready to track",
  "Let's go",
  "Back again",
  "There you are",
  "Glad you're here",
  "Happy tracking"
];

function getGreeting(userName: string): string {
  // Use day of year to select greeting (consistent throughout the day)
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const greetingIndex = dayOfYear % greetings.length;
  const greeting = greetings[greetingIndex];
  
  // Mix up the format based on the day
  const formats = [
    `${greeting}, ${userName}`,
    `${greeting}, ${userName}!`,
    `Hi ${userName}`,
    `Hi ${userName}!`,
    `Hey ${userName}`,
    `Hey ${userName}!`,
    `${userName}, ${greeting.toLowerCase()}`,
    `${greeting} ${userName}`,
  ];
  
  // Use a different seed to pick format (offset by greeting length to vary)
  const formatIndex = (dayOfYear + greeting.length) % formats.length;
  return formats[formatIndex];
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.name || user?.displayName || user?.email?.split('@')[0] || 'there';
  const greetingMessage = getGreeting(userName);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl pl-2 font-light">{greetingMessage}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start pb-20">
        <div className="space-y-6">
          <BudgetView />
          <div className="px-2">
            <Button 
              className="w-full rounded-full" 
              size="lg"
              onClick={() => router.push('/dashboard/entry')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
          <DailyView />
        </div>
        <MonthlyView />
      </div>

      <div className="fixed bottom-6 right-6">
        <Button 
          size="lg" 
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => router.push('/dashboard/entry')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
}