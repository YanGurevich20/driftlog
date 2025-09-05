'use client';

import { useState, useEffect, useCallback } from 'react';
import { CategoryName, CATEGORY_NAMES, getCategoriesByAffiliation, getBothCategories } from '@/types/category';

const STORAGE_KEY = 'driftlog-recent-categories';
const MAX_RECENT_CATEGORIES = 5;

interface RecentCategories {
  expense: CategoryName[];
  income: CategoryName[];
}

export function useCategoryRanking() {
  const [recentCategories, setRecentCategories] = useState<RecentCategories>({
    expense: [],
    income: []
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentCategories;
        setRecentCategories(parsed);
      }
    } catch (error) {
      console.warn('Failed to load recent categories from localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever recentCategories changes
  const saveToLocalStorage = useCallback((categories: RecentCategories) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
      console.warn('Failed to save recent categories to localStorage:', error);
    }
  }, []);

  // Track category usage - bumps category to front of list
  const trackCategoryUsage = useCallback((category: CategoryName, type: 'expense' | 'income') => {
    setRecentCategories(prev => {
      const currentList = prev[type];
      
      // Remove category if it exists in the list
      const filteredList = currentList.filter(c => c !== category);
      
      // Add category to the front
      const newList = [category, ...filteredList].slice(0, MAX_RECENT_CATEGORIES);
      
      const newCategories = {
        ...prev,
        [type]: newList
      };
      
      // Save to localStorage
      saveToLocalStorage(newCategories);
      
      return newCategories;
    });
  }, [saveToLocalStorage]);

  // Get ranked categories for a specific type
  const getRankedCategories = useCallback((type: 'expense' | 'income'): CategoryName[] => {
    const recent = recentCategories[type];
    const remaining = CATEGORY_NAMES.filter(category => !recent.includes(category));
    
    // Split remaining categories by affiliation
    const affiliated = getCategoriesByAffiliation(type).filter(category => !recent.includes(category));
    const both = getBothCategories().filter(category => !recent.includes(category));
    const otherAffiliated = remaining.filter(category => 
      !affiliated.includes(category) && !both.includes(category)
    );
    
    return [
      ...recent,                    // 1. Recent usage
      ...affiliated,                // 2. Type affiliation
      ...both,                      // 3. Both categories
      ...otherAffiliated            // 4. Other affiliated categories
    ];
  }, [recentCategories]);

  // Get the smart default category for a type
  const getDefaultCategory = useCallback((type: 'expense' | 'income'): CategoryName => {
    const recent = recentCategories[type];
    
    // Return most recent if available
    if (recent.length > 0) {
      return recent[0];
    }
    
    // Fallback to smart defaults
    return type === 'income' ? 'Salary' : 'Food & Dining';
  }, [recentCategories]);

  return {
    trackCategoryUsage,
    getRankedCategories,
    getDefaultCategory,
    recentCategories
  };
}