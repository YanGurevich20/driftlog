'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MonthPicker } from '@/components/ui/month-picker';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from 'lucide-react';
import { format, isSameYear } from 'date-fns';

interface DateNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  mode?: 'day' | 'month';
  formatOptions?: {
    day?: string;
    dayCurrentYear?: string;
    month?: string;
  };
  disabled?: (date: Date) => boolean;
}

export function DateNavigation({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  mode = 'day',
  formatOptions = {
    day: 'PPP',
    dayCurrentYear: 'EEEE, MMMM d',
    month: 'MMMM yyyy',
  },
  disabled,
}: DateNavigationProps) {
  const formatDate = () => {
    if (mode === 'day') {
      return isSameYear(selectedDate, new Date())
        ? format(selectedDate, formatOptions.dayCurrentYear!)
        : format(selectedDate, formatOptions.day!);
    }
    return format(selectedDate, formatOptions.month!);
  };

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="h-9 w-9"
      >
        <ChevronLeftIcon />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="font-normal h-9 min-w-[200px] justify-between">
            <span>{formatDate()}</span>
            <CalendarIcon className="h-4 w-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          {mode === 'day' ? (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              disabled={disabled}
            />
          ) : (
            <MonthPicker
              currentMonth={selectedDate}
              onMonthChange={onDateChange}
            />
          )}
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!canGoNext}
        className="h-9 w-9"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}