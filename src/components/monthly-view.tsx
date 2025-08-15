'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpaceCurrency } from '@/hooks/use-space-currency';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DateNavigation } from '@/components/ui/date-navigation';
import { DataState } from '@/components/ui/data-state';
import { addMonths, subMonths, isSameMonth } from 'date-fns';
import { Receipt } from 'lucide-react';
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
  
  const { currency: spaceBaseCurrency } = useSpaceCurrency(user?.defaultSpaceId);

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


  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold mb-4 text-primary">Monthly View</h2>
        <DateNavigation
          selectedDate={selectedMonth}
          onDateChange={setSelectedMonth}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          mode="month"
        />
      </CardHeader>
      
      <CardContent>
        <DataState
          loading={loading}
          empty={entries.length === 0}
          loadingVariant="skeleton"
          emptyTitle="No entries for this month"
          emptyDescription="Add your first entry for this month"
          emptyIcon={Receipt}
        >
          <div className="space-y-4">
            {incomeCategories.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Income</h3>
                {incomeCategories.map(([category, data]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(data.total, spaceBaseCurrency, false, true)}
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
                      {formatCurrency(data.total, spaceBaseCurrency, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DataState>
      </CardContent>

      {entries.length > 0 && (
        <>
          <Separator />
          <CardFooter className="pt-4">
            <div className="flex justify-between w-full">
              <span className="font-medium">Monthly Net</span>
              <span className={`text-lg font-bold ${monthlyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(monthlyNet), spaceBaseCurrency, monthlyNet < 0)}
              </span>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}