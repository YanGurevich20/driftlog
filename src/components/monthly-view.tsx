'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrencyWithSign } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpace } from '@/hooks/use-space';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DateNavigation } from '@/components/ui/date-navigation';
import { addMonths, subMonths, isSameMonth } from 'date-fns';
import { getDateRangeForMonth } from '@/lib/date-range-utils';

export function MonthlyView() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const dateRange = getDateRangeForMonth(selectedMonth);
  
  const { entries, loading } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  const { space } = useSpace(user?.defaultSpaceId);
  const spaceBaseCurrency = space?.baseCurrency || 'USD';

  const categoryTotals = entries.reduce((acc, entry) => {
    const category = entry.category;
    if (!acc[category]) {
      acc[category] = {
        total: 0,
        type: entry.type,
      };
    }
    acc[category].total += entry.convertedAmount || entry.amount;
    return acc;
  }, {} as Record<string, { total: number; type: 'income' | 'expense' }>);

  const monthlyNet = Object.values(categoryTotals).reduce((sum, category) => {
    return sum + (category.type === 'income' ? category.total : -category.total);
  }, 0);

  const incomeCategories = Object.entries(categoryTotals)
    .filter(([, data]) => data.type === 'income')
    .sort((a, b) => b[1].total - a[1].total);

  const expenseCategories = Object.entries(categoryTotals)
    .filter(([, data]) => data.type === 'expense')
    .sort((a, b) => b[1].total - a[1].total);

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const canGoNext = !isSameMonth(selectedMonth, new Date());
  const canGoPrevious = true;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-10 bg-muted/50 rounded animate-pulse" />
          <div className="h-12 bg-muted/50 rounded animate-pulse mt-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-4">
          <DateNavigation
            selectedDate={selectedMonth}
            onDateChange={setSelectedMonth}
            onPrevious={handlePreviousMonth}
            onNext={handleNextMonth}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            mode="month"
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Monthly Net</p>
          <p className={`text-3xl font-bold ${monthlyNet >= 0 ? 'text-primary' : ''}`}>
            {formatCurrencyWithSign(Math.abs(monthlyNet), spaceBaseCurrency, monthlyNet < 0)}
          </p>
        </div>
      </CardHeader>
      
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries for this month
          </div>
        ) : (
          <div className="space-y-4">
            {incomeCategories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Income</h3>
                {incomeCategories.map(([category, data]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="font-semibold text-primary">
                      {formatCurrencyWithSign(data.total, spaceBaseCurrency, false, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {incomeCategories.length > 0 && expenseCategories.length > 0 && (
              <Separator />
            )}

            {expenseCategories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Expenses</h3>
                {expenseCategories.map(([category, data]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="font-semibold">
                      {formatCurrencyWithSign(data.total, spaceBaseCurrency, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}