'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpaceCurrency } from '@/hooks/use-space-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDaysInMonth } from 'date-fns';
import { getDateRangeForDay, getDateRangeForMonth } from '@/lib/date-range-utils';
import { DataState } from '@/components/ui/data-state';
import { Wallet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function BudgetView() {
  const { user } = useAuth();
  const [selectedDate] = useState(new Date());
  
  const dateRange = getDateRangeForDay(selectedDate);
  const monthRange = getDateRangeForMonth(selectedDate);
  
  // Fetch today's entries
  const { entries: todayEntries, loading: todayLoading } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  // Fetch all month entries for budget calculation
  const { entries: monthEntries, loading: monthLoading } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: monthRange.start,
    endDate: monthRange.end,
  });
  
  const { currency: spaceBaseCurrency } = useSpaceCurrency(user?.defaultSpaceId);
  
  // Calculate daily budget
  const calculateBudget = () => {
    // All income for the month (including today and future)
    const monthlyIncome = monthEntries
      .filter(e => e.type === 'income')
      .reduce((sum, entry) => {
        return sum + entry.convertedAmount;
      }, 0);
    
    // All expenses for the month (including today and future)
    const monthlyExpenses = monthEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, entry) => {
        return sum + entry.convertedAmount;
      }, 0);
    
    // Calculate today's spending (expenses only)
    const todaysExpenses = todayEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.convertedAmount, 0);
    const monthlyExpensesWithoutToday = monthlyExpenses - todaysExpenses;
    // Calculate remaining days in month (including today)
    const today = selectedDate.getDate();
    const totalDaysInMonth = getDaysInMonth(selectedDate);
    const remainingDays = totalDaysInMonth - today + 1;
    
    // Calculate daily budget: (all income - all expenses without today) / remaining days
    const availableNet = monthlyIncome - monthlyExpensesWithoutToday;
    const dailyBudget = availableNet > 0 ? availableNet / remainingDays : 0;
    
    
    return { 
      dailyBudget, 
      todaysExpenses, 
      remainingDays,
      availableNet 
    };
  };
  
  const { dailyBudget, todaysExpenses } = calculateBudget();
  const loading = todayLoading || monthLoading;
  const percentUsed = dailyBudget > 0 ? (todaysExpenses / dailyBudget) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Today&apos;s Budget</CardTitle>
      </CardHeader>
      
      <CardContent>
        <DataState
          loading={loading}
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
                {formatCurrency(todaysExpenses, spaceBaseCurrency, false)} / {formatCurrency(dailyBudget, spaceBaseCurrency, false)}
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
      </CardContent>
    </Card>
  );
}