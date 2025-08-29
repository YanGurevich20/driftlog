'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DailyView } from '@/components/daily-view';
import { MonthlyView } from '@/components/monthly-view';
import { BudgetView } from '@/components/budget-view';
import { RecurringView } from '@/components/recurring-view';
import { useAuth } from '@/lib/auth-context';
import { LLMEntryInput } from '@/components/llm-entry-input';

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
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const greetingMessage = getGreeting(firstName);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl pl-2 font-light">{greetingMessage}</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 md:items-start pb-32">
        <div className="space-y-6">
          <BudgetView />
          <div className="px-2">
            <Button 
              className="w-full rounded-full" 
              size="lg"
              asChild
            >
              <Link href="/dashboard/entry">
                <Plus className="mr-2" />
                Add Entry
              </Link>
            </Button>
          </div>
          <DailyView />
        </div>
        <div className="space-y-6">
          <MonthlyView />
          <RecurringView />
        </div>
      </div>

      <LLMEntryInput />
    </>
  );
}