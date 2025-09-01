'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { 
  CollapsibleCard, 
  CollapsibleCardContent, 
  CollapsibleCardHeader, 
  CollapsibleCardTitle 
} from '@/components/ui/collapsible-card';
import { getDaysInMonth, isSameDay } from 'date-fns';
import { getDateRangeForMonth } from '@/lib/date-range-utils';
import { DataState } from '@/components/ui/data-state';
import { Wallet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function BudgetView() {
  const { user } = useAuth();
  const [selectedDate] = useState(new Date());
  
  const monthRange = getDateRangeForMonth(selectedDate);
  
  // Fetch all month entries for budget calculation
  const { entries: monthEntries, loading: monthLoading, error: monthError } = useEntries({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });
  
  // Derive today's entries from month entries
  const todayEntries = useMemo(() => {
    return monthEntries.filter(entry => isSameDay(entry.date, selectedDate));
  }, [monthEntries, selectedDate]);
  
  const displayCurrency = user?.displayCurrency || 'USD';
  const { ratesByMonth, error: ratesError, loading: ratesLoading } = useExchangeRates({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });
  
  // Calculate daily budget
  const { dailyBudget, todaysExpenses } = useMemo(() => {
    if (ratesLoading || !ratesByMonth) {
      return { dailyBudget: 0, todaysExpenses: 0, remainingDays: 0, availableNet: 0 };
    }
    // All income for the month (including today and future)
    const monthlyIncome = monthEntries
      .filter(e => e.type === 'income')
      .reduce((sum, entry) => {
        const converted = convertAmount(
          entry.originalAmount,
          entry.currency,
          displayCurrency,
          entry.date,
          ratesByMonth
        );
        return sum + converted;
      }, 0);
    
    // All expenses for the month (including today and future)
    const monthlyExpenses = monthEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, entry) => {
        const converted = convertAmount(
          entry.originalAmount,
          entry.currency,
          displayCurrency,
          entry.date,
          ratesByMonth
        );
        return sum + converted;
      }, 0);
    
    // Calculate today's spending (expenses only)
    const todaysExpenses = todayEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => {
        const converted = convertAmount(
          e.originalAmount,
          e.currency,
          displayCurrency,
          e.date,
          ratesByMonth
        );
        return sum + converted;
      }, 0);
    const monthlyExpensesWithoutToday = monthlyExpenses - todaysExpenses;
    // Calculate remaining days in month (including today)
    const today = selectedDate.getDate();
    const totalDaysInMonth = getDaysInMonth(selectedDate);
    const remainingDays = totalDaysInMonth - today + 1;
    
    // Calculate daily budget: (all income - all expenses without today) / remaining days
    const availableNet = monthlyIncome - monthlyExpensesWithoutToday;
    const dailyBudget = monthlyIncome > 0 ? availableNet / remainingDays : 0;
    
    
    return { 
      dailyBudget, 
      todaysExpenses, 
      remainingDays,
      availableNet
    };
  }, [monthEntries, todayEntries, displayCurrency, selectedDate, ratesByMonth, ratesLoading]);
  const percentUsed = dailyBudget > 0 ? (todaysExpenses / dailyBudget) * 100 : 0;
  
  return (
    <CollapsibleCard defaultCollapsed={dailyBudget === 0}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Today&apos;s Budget</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      
      <CollapsibleCardContent>
        <DataState
          loading={monthLoading || ratesLoading}
          error={monthError || ratesError}
          empty={dailyBudget === 0}
          loadingVariant="skeleton"
          emptyTitle="No budget available"
          emptyDescription="Add income to see your daily budget"
          emptyIcon={Wallet}
        >
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Spent:</span>
              <span className="text-sm font-medium">
                {formatCurrency(todaysExpenses, displayCurrency, false)} / {formatCurrency(dailyBudget, displayCurrency, false)}
              </span>
            </div>
            
            <Progress 
              value={Math.min(percentUsed, 100)} 
              className={`h-2 ${
                percentUsed > 100 ? '[&>*]:bg-orange-400' : percentUsed > 80 ? '[&>*]:bg-yellow-500' : ''
              }`}
            />
          </div>
        </DataState>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}