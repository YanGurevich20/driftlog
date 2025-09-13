export type LandingFeature = {
  id: string;
  title: string;
  description: string[];
  startTime: number;
};

export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: 'add-entry',
    title: 'Start logging.',
    description: ['Add any entry in two clicks.'],
    startTime: 0,
  },
  {
    id: 'add-budget',
    title: 'Set boundaries.',
    description: ["Tell your money who's boss."],
    startTime: 10,
  },
  {
    id: 'add-other-currency',
    title: 'Speak fluent money.',
    description: ['Spend in Rubles, see it in dollars.', 'Or the other way around.'],
    startTime: 20,
  },
  {
    id: 'add-recurring',
    title: 'Make it a habit.',
    description: ['Daily, weekly, monthly—whatever keeps the chaos in check.'],
    startTime: 32,
  },
  {
    id: 'add-ai-entry',
    title: 'Type whatever, get structure.',
    description: ['Write anything you want, let the robots do the thinking'],
    startTime: 49,
  },
  {
    id: 'add-connection',
    title: 'Share the pain.',
    description: [
      'Connect and sync in real time.',
      "If you're reading this, just sign in and try for yourself.",
    ],
    startTime: 58,
  },
];


