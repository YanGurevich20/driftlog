import { 
  BriefcaseMedical, 
  Hotel, 
  Car, 
  ShoppingBag, 
  Briefcase, 
  LucideIcon, 
  Utensils, 
  Zap, 
  Wallet,
  Gift,
  Squirrel,
  Home,
  ShoppingCart,
  Martini,
  Dumbbell,
  Plane,
  GraduationCap,
  Sparkles,
  PawPrint,
  Percent,
  Shield,
  HandHeart,
  Landmark,
  Repeat,
  Baby,
  FileQuestion,
} from "lucide-react";

export const CATEGORIES = {
  'Food & Dining': Utensils,
  'Groceries': ShoppingCart,
  'Transportation': Car,
  'Flights': Plane,
  'Accommodation': Hotel,
  'Entertainment': Martini,
  'Shopping': ShoppingBag,
  'Health': BriefcaseMedical,
  'Bills': Zap,
  'Fitness': Dumbbell,
  'Education': GraduationCap,
  'Personal Care': Sparkles,
  'Insurance': Shield,
  'Pets': PawPrint,
  'Children': Baby,
  'Subscriptions': Repeat,
  'Salary': Wallet,
  'Work & Business': Briefcase,
  'Investment': Landmark,
  'Gift': Gift,
  'Taxes': Percent,
  'Charity': HandHeart,
  'Rental': Home,
  'Other': Squirrel,
} as const

export type CategoryName = keyof typeof CATEGORIES;

export const DEFAULT_CATEGORIES: Record<'expense' | 'income', CategoryName[]> = {
  expense: [
    'Food & Dining',
    'Transportation',
    'Accommodation',
    'Shopping',
    'Health',
    'Subscriptions',
    'Other',
  ],
  income: [
    'Salary',
    'Work & Business',
    'Other',
  ],
}

export const getCategoryIcon = (name: string): LucideIcon => {
  return CATEGORIES[name as CategoryName] || FileQuestion;
}