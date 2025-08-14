'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle>This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className={`text-3xl font-bold ${netAmount >= 0 ? 'text-primary' : ''}`}>
            {netAmount < 0 ? '-' : ''}{formatCurrency(Math.abs(netAmount), baseCurrency)}
          </p>
          <p className="text-xs text-muted-foreground">{baseCurrency}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowDown className="h-3 w-3" />
              Expenses
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(stats.totalExpenses, baseCurrency)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowUp className="h-3 w-3 text-primary" />
              Income
            </div>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(stats.totalIncome, baseCurrency)}
            </p>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}