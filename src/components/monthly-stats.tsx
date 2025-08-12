'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency-utils';
import type { MonthlyStats } from '@/types';

export function MonthlyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonthlyStats>({
    totalExpenses: 0,
    totalIncome: 0,
    entryCount: 0,
    topCategories: [],
  });
  const [baseCurrency, setBaseCurrency] = useState('USD');

  useEffect(() => {
    if (!user?.defaultSpaceId) return;

    // Get space's base currency
    getDoc(doc(db, 'spaces', user.defaultSpaceId)).then((spaceDoc) => {
      if (spaceDoc.exists()) {
        setBaseCurrency(spaceDoc.data().baseCurrency || 'USD');
      }
    });

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const q = query(
      collection(db, 'entries'),
      where('spaceId', '==', user.defaultSpaceId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalExpenses = 0;
      let totalIncome = 0;
      const categoryMap = new Map<string, { amount: number; count: number }>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter for current month
        if (!data.date || data.date.toDate() < monthStart || data.date.toDate() > monthEnd) {
          return;
        }
        
        if (data.type === 'expense') {
          totalExpenses += data.convertedAmount || data.amount;
          
          const current = categoryMap.get(data.category) || { amount: 0, count: 0 };
          categoryMap.set(data.category, {
            amount: current.amount + (data.convertedAmount || data.amount),
            count: current.count + 1,
          });
        } else if (data.type === 'income') {
          totalIncome += data.convertedAmount || data.amount;
        }
      });

      const topCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      setStats({
        totalExpenses,
        totalIncome,
        entryCount: snapshot.size,
        topCategories,
      });
    });

    return () => unsubscribe();
  }, [user?.defaultSpaceId]);

  const netAmount = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4">This Month</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className={`text-3xl font-bold ${netAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {formatCurrencyWithSign(Math.abs(netAmount), baseCurrency, netAmount >= 0)}
            </p>
            <p className="text-xs text-muted-foreground">{baseCurrency}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Income
              </div>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.totalIncome, baseCurrency)}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingDown className="h-3 w-3" />
                Spent
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(stats.totalExpenses, baseCurrency)}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {stats.entryCount} {stats.entryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Top Categories</h3>
        
        {stats.topCategories.length > 0 ? (
          <div className="space-y-3">
            {stats.topCategories.map((cat, index) => (
              <div key={cat.category} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {index + 1}. {cat.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({cat.count})
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(cat.amount, baseCurrency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No expenses yet</p>
        )}
      </div>
    </div>
  );
}