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
  'Food & Dining': { icon: Utensils, affiliation: 'expense' },
  'Transportation': { icon: Car, affiliation: 'expense' },
  'Groceries': { icon: ShoppingCart, affiliation: 'expense' },
  'Shopping': { icon: ShoppingBag, affiliation: 'expense' },
  'Bills': { icon: Zap, affiliation: 'expense' },
  'Insurance': { icon: Shield, affiliation: 'expense' },
  'Entertainment': { icon: Martini, affiliation: 'expense' },
  'Health': { icon: BriefcaseMedical, affiliation: 'expense' },
  'Personal Care': { icon: Droplets, affiliation: 'expense' },
  'Household': { icon: HousePlug, affiliation: 'expense' },
  'Beauty': { icon: Sparkles, affiliation: 'expense' },
  'Rent': { icon: Home, affiliation: 'expense' },
  'Accommodation': { icon: Hotel, affiliation: 'expense' },
  'Flights': { icon: Plane, affiliation: 'expense' },
  'Subscriptions': { icon: Repeat, affiliation: 'expense' },
  'Fitness': { icon: Dumbbell, affiliation: 'expense' },
  'Education': { icon: GraduationCap, affiliation: 'expense' },
  'Taxes': { icon: Percent, affiliation: 'expense' },
  'Pets': { icon: PawPrint, affiliation: 'expense' },
  'Children': { icon: Baby, affiliation: 'expense' },
  'Charity': { icon: HandHeart, affiliation: 'expense' },
  'Investment': { icon: PiggyBank, affiliation: 'expense' },
  
  'Salary': { icon: HandCoins, affiliation: 'income' },
  'Business': { icon: Briefcase, affiliation: 'income' },
  
  'Gift': { icon: Gift, affiliation: 'both' },
  'Other': { icon: Squirrel, affiliation: 'both' },
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