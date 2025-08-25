import { useAuth } from '@/lib/auth-context';
import { DEFAULT_CATEGORIES, CategoryName } from '@/types/categories';

export function useCategories() {
  const { user } = useAuth();

  const getCategories = (type: 'expense' | 'income'): CategoryName[] => {
    return user?.categories?.[type] || DEFAULT_CATEGORIES[type];
  };

  return {
    getCategories,
    userCategories: user?.categories,
  };
}
