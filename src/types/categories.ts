import { 
  BriefcaseMedical, 
  Hotel, 
  Car, 
  ShoppingBag, 
  Briefcase, 
  LucideIcon, 
  Utensils, 
  Zap, 
  HandCoins,
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
  PiggyBank,
  Repeat,
  Baby,
  FileQuestion,
  HousePlug,
  Droplets,
} from "lucide-react";

interface CategoryConfig {
  icon: LucideIcon;
  affiliation: 'expense' | 'income' | 'both';
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  // Most common expense categories (daily/weekly)
  'Food & Dining': { icon: Utensils, affiliation: 'expense' },
  'Transportation': { icon: Car, affiliation: 'expense' },
  'Groceries': { icon: ShoppingCart, affiliation: 'expense' },
  'Shopping': { icon: ShoppingBag, affiliation: 'expense' },
  
  // Regular recurring expenses (monthly)
  'Bills': { icon: Zap, affiliation: 'expense' },
  'Subscriptions': { icon: Repeat, affiliation: 'expense' },
  'Insurance': { icon: Shield, affiliation: 'expense' },
  
  // Common discretionary expenses
  'Entertainment': { icon: Martini, affiliation: 'expense' },
  'Health': { icon: BriefcaseMedical, affiliation: 'expense' },
  'Fitness': { icon: Dumbbell, affiliation: 'expense' },
  'Personal Care': { icon: Droplets, affiliation: 'expense' },
  'Beauty': { icon: Sparkles, affiliation: 'expense' },
  'Household': { icon: HousePlug, affiliation: 'expense' },
  
  // Most common income categories
  'Salary': { icon: HandCoins, affiliation: 'income' },
  'Work & Business': { icon: Briefcase, affiliation: 'income' },
  'Investment': { icon: PiggyBank, affiliation: 'income' },
  'Rental': { icon: Home, affiliation: 'income' },
  
  // Universal categories
  'Gift': { icon: Gift, affiliation: 'both' },
  'Other': { icon: Squirrel, affiliation: 'both' },
  
  // Less common expense categories
  'Flights': { icon: Plane, affiliation: 'expense' },
  'Accommodation': { icon: Hotel, affiliation: 'expense' },
  'Education': { icon: GraduationCap, affiliation: 'expense' },
  'Pets': { icon: PawPrint, affiliation: 'expense' },
  'Children': { icon: Baby, affiliation: 'expense' },
  'Taxes': { icon: Percent, affiliation: 'expense' },
  'Charity': { icon: HandHeart, affiliation: 'expense' },
} as const

export const CATEGORY_NAMES = Object.keys(CATEGORIES) as CategoryName[];
export type CategoryName = keyof typeof CATEGORIES;

export const getCategoriesByAffiliation = (type: 'expense' | 'income'): CategoryName[] => {
  return CATEGORY_NAMES.filter(category => 
    CATEGORIES[category].affiliation === type
  );
};

export const getBothCategories = (): CategoryName[] => {
  return CATEGORY_NAMES.filter(category => 
    CATEGORIES[category].affiliation === 'both'
  );
};

export const getCategoryIcon = (name: string): LucideIcon => {
  return CATEGORIES[name as CategoryName]?.icon || FileQuestion;
}