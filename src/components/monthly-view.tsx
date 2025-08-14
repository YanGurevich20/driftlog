'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrencyWithSign } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpace } from '@/hooks/use-space';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthPicker } from '@/components/ui/month-picker';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isAfter, isSameMonth } from 'date-fns';
import type { Entry } from '@/types';

export function MonthlyView() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const startOfSelectedMonth = startOfMonth(selectedMonth);
  const endOfSelectedMonth = endOfMonth(selectedMonth);
  
  const { entries, loading } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: startOfSelectedMonth,
    endDate: endOfSelectedMonth,
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
    .filter(([_, data]) => data.type === 'income')
    .sort((a, b) => b[1].total - a[1].total);

  const expenseCategories = Object.entries(categoryTotals)
    .filter(([_, data]) => data.type === 'expense')
    .sort((a, b) => b[1].total - a[1].total);

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const canGoNext = !isSameMonth(selectedMonth, new Date());
  const firstEntry = entries.length > 0 ? entries[entries.length - 1] : null;
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
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            disabled={!canGoPrevious}
            className="size-8"
          >
            <ChevronLeftIcon />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedMonth, 'MMMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <MonthPicker
                currentMonth={selectedMonth}
                onMonthChange={(date) => setSelectedMonth(date)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="size-8"
          >
            <ChevronRightIcon />
          </Button>
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