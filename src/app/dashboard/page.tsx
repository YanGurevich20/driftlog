'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { useEntryAnimation } from '@/contexts/entry-animation-context';

const BudgetView = dynamic(() => import('@/components/budget-view').then(m => m.BudgetView));
const ConfirmationView = dynamic(() => import('@/components/confirmation-view').then(m => m.ConfirmationView));
const NewEntryView = dynamic(() => import('@/components/new-entry-view').then(m => m.NewEntryView));
const EntriesView = dynamic(() => import('@/components/entries-view').then(m => m.EntriesView));
const RecurringView = dynamic(() => import('@/components/recurring-view').then(m => m.RecurringView));

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
  const { animationData, setAnimationData } = useEntryAnimation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [animatingEntryId, setAnimatingEntryId] = useState<string | undefined>(() => animationData?.entryId);
  
  const firstName = user?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  // Handle animation data
  useEffect(() => {
    if (animationData) {
      setAnimatingEntryId(animationData.entryId);
      setSelectedDate(animationData.date);
      setAnimationData(null);
    }
  }, [animationData, setAnimationData]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl pl-2 font-light">{getGreeting(firstName)}</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 md:items-start pb-32">
        <div className="space-y-6">
          <BudgetView />
          <ConfirmationView />
          <NewEntryView
            onDateChange={setSelectedDate}
            onEntryCreated={setAnimatingEntryId}
          />
          <EntriesView
            mode="daily"
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            animatingEntryId={animatingEntryId}
            onAnimationComplete={() => setAnimatingEntryId(undefined)}
          />
        </div>
        <div className="space-y-6">
          <EntriesView mode="monthly" />
          <RecurringView />
        </div>
      </div>

    </>
  );
}