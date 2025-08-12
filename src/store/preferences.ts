import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  lastUsedCurrency: string;
  recentCurrencies: string[];
  setLastUsedCurrency: (currency: string) => void;
  addRecentCurrency: (currency: string) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      lastUsedCurrency: 'USD',
      recentCurrencies: ['USD', 'EUR', 'THB'],
      
      setLastUsedCurrency: (currency) =>
        set(() => ({
          lastUsedCurrency: currency,
        })),
      
      addRecentCurrency: (currency) =>
        set((state) => {
          const recent = [currency, ...state.recentCurrencies.filter(c => c !== currency)];
          return {
            recentCurrencies: recent.slice(0, 5), // Keep only 5 most recent
          };
        }),
    }),
    {
      name: 'driftlog-preferences',
    }
  )
);