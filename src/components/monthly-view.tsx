'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthPicker } from '@/components/ui/month-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { DataState } from '@/components/ui/data-state';
import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import { getDateRangeForMonth } from '@/lib/date-range-utils';

export function MonthlyView() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const dateRange = getDateRangeForMonth(selectedMonth);
  
  const { entries, loading } = useEntries({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  const displayCurrency = user?.displayCurrency || 'USD';
  const { convert } = useExchangeRates();

  const categoryTotals = entries.reduce((acc, entry) => {
    const category = entry.category;
    if (!acc[category]) {
      acc[category] = {
        total: 0,
        type: entry.type,
      };
    }
    // Convert to display currency on the fly
    const convertedAmount = convert(
      entry.originalAmount,
      entry.currency,
      displayCurrency
    );
    acc[category].total += convertedAmount;
    return acc;
  }, {} as Record<string, { total: number; type: 'income' | 'expense' }>);

  const monthlyNet = Object.values(categoryTotals).reduce((sum, category) => {
    return sum + (category.type === 'income' ? category.total : -category.total);
  }, 0);

  // Sort all categories by net amount (income positive, expense negative)
  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      net: data.type === 'income' ? data.total : -data.total,
      total: data.total,
      type: data.type
    }))
    .sort((a, b) => b.net - a.net);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-primary">
            {format(selectedMonth, 'MMMM yyyy')}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <CalendarIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <MonthPicker
                currentMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </PopoverContent>
          </Popover>
        </div>
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
          <div className="space-y-3">
            {sortedCategories.map((item) => (
              <div key={item.category} className="flex justify-between items-center">
                <span className="text-sm">{item.category}</span>
                <span className={`font-semibold ${item.net >= 0 ? 'text-primary' : ''}`}>
                  {formatCurrency(
                    item.total, 
                    displayCurrency, 
                    item.type === 'expense',
                    item.type === 'income'
                  )}
                </span>
              </div>
            ))}
          </div>
        </DataState>
      </CardContent>

      {entries.length > 0 && (
        <>
          <CardFooter className="pt-4">
            <div className="flex justify-between w-full">
              <span className="font-medium">Monthly Net</span>
              <span className={`text-lg font-bold ${monthlyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(monthlyNet), displayCurrency, monthlyNet < 0)}
              </span>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}