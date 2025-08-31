'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { usePreferences } from '@/store/preferences';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { toUTCMidnight, fromUTCMidnight } from '@/lib/date-utils';
import { RECURRENCE_LIMITS } from '@/types';
import type { Entry, RecurrenceFrequency } from '@/types';
import type { CategoryName } from '@/types/categories';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRecurringTemplate } from '@/services/recurring';
import RecurringSection from '@/components/entry-form/recurrence-form';
import { SERVICE_START_DATE } from '@/lib/config';
import { Input } from '../ui/input';
import { CATEGORY_NAMES } from '@/types/categories';
import { useCategoryRanking } from '@/hooks/use-category-ranking';

const formSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountCurrency: z.object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, 'Amount must be greater than 0'),
    currency: z.string().min(1, 'Currency is required'),
  }),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EntryFormProps {
  entry?: Entry | null;
  onSuccess?: () => void;
}

export function EntryForm({ entry, onSuccess }: EntryFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lastUsedCurrency, setLastUsedCurrency, addRecentCurrency } = usePreferences();
  const { trackCategoryUsage, getDefaultCategory, recentCategories } = useCategoryRanking();
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurrenceFrequency>('monthly');
  const [endDate, setEndDate] = useState<Date>(() => {
    return addMonths(new Date(), RECURRENCE_LIMITS.monthly.defaultMonths);
  });
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [interval, setInterval] = useState<number>(1);

  // Get smart default category
  const getSmartDefaultCategory = useCallback((type: 'expense' | 'income') => {
    if (entry?.category) return entry.category;
    return getDefaultCategory(type);
  }, [entry?.category, getDefaultCategory]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry?.type || 'expense',
      amountCurrency: {
        amount: entry ? entry.originalAmount.toString() : '',
        currency: entry?.currency || lastUsedCurrency || 'USD',
      },
      category: getSmartDefaultCategory(entry?.type || 'expense'),
      description: entry?.description || '',
      date: entry ? fromUTCMidnight(entry.date) : new Date(),
    },
  });

  // Set initial currency
  useEffect(() => {
    // If no last used currency, set to user's display currency
    if (!lastUsedCurrency && !entry && user?.displayCurrency) {
      form.setValue('amountCurrency.currency', user.displayCurrency);
    }
  }, [user?.displayCurrency, lastUsedCurrency, form, entry]);

  const transactionType = form.watch('type');

  // Update category when entry type changes or when smart defaults are available
  useEffect(() => {
    // Don't override category for existing entries
    if (entry?.category) return;
    
    const currentCategory = form.getValues('category');
    const smartDefault = getSmartDefaultCategory(transactionType);
    
    // Update if current category is invalid or if we have a better smart default
    const hasValidCategory = CATEGORY_NAMES.includes(currentCategory as CategoryName);
    const shouldUpdate = !hasValidCategory || currentCategory !== smartDefault;
    
    if (shouldUpdate) {
      form.setValue('category', smartDefault);
    }
  }, [transactionType, getSmartDefaultCategory, form, entry?.category, recentCategories]);

  // Default weekly selection to the picked date's weekday when enabling weekly
  useEffect(() => {
    const freq = recurringFrequency;
    if (isRecurring && freq === 'weekly' && selectedWeekdays.length === 0) {
      const d = form.watch('date') || new Date();
      setSelectedWeekdays([d.getDay()]);
    }
  }, [isRecurring, recurringFrequency, form, selectedWeekdays.length]);

  const watchedDate = form.watch('date');
  
  // Update end date when start date changes
  useEffect(() => {
    if (isRecurring) {
      const selectedDate = watchedDate || new Date();
      const newEndDate = addMonths(selectedDate, RECURRENCE_LIMITS[recurringFrequency].defaultMonths);
      setEndDate(newEndDate);
    }
  }, [watchedDate, isRecurring, recurringFrequency]);

  // No-op: toggling handled in RecurringSection

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(values.amountCurrency.amount);
      const currency = values.amountCurrency.currency;

      // Enforce service start date for selected date
      const selectedLocalDate = form.watch('date') || new Date();
      const selectedUtcDate = toUTCMidnight(selectedLocalDate);
      if (selectedUtcDate < SERVICE_START_DATE) {
        toast.warning('Date cannot be before Jan 1, 2025');
        setIsSubmitting(false);
        return;
      }

      if (isRecurring && !entry) {
        const pickedDate = selectedLocalDate;
        const pickedUtc = selectedUtcDate;
        // Enforce endDate is not before start
        if (toUTCMidnight(endDate) < pickedUtc) {
          toast.warning('End date cannot be before start date');
          setIsSubmitting(false);
          return;
        }
        const templateData = {
          userId: user.id,
          entryTemplate: {
            type: values.type,
            originalAmount: amount,
            currency,
            category: values.category,
            description: values.description || '',
          },
          recurrence: {
            frequency: recurringFrequency,
            interval: interval,
            endDate: endDate,
            ...(recurringFrequency === 'weekly'
              ? (selectedWeekdays.length ? { daysOfWeek: selectedWeekdays } : { daysOfWeek: [pickedDate.getDay()] })
              : {}),
            ...(recurringFrequency === 'monthly'
              ? { dayOfMonth: pickedDate.getDate() }
              : {}),
          },
          startDate: pickedUtc,
          createdBy: user.id,
        };

        await createRecurringTemplate(templateData);
        toast.success(`Created recurring entries until ${format(endDate, 'MMM d, yyyy')}`);
        
        // Track category usage
        trackCategoryUsage(values.category as CategoryName, values.type);
        
        setLastUsedCurrency(currency);
        addRecentCurrency(currency);
        onSuccess?.();
        router.push('/dashboard');
      } else {
        const entryData = {
          type: values.type,
          userId: user.id,
          originalAmount: amount,
          currency,
          category: values.category,
          description: values.description || '',
          date: selectedUtcDate,
          ...(entry ? {
            updatedBy: user.id,
            updatedAt: serverTimestamp(),
            ...(entry.isRecurringInstance ? { isModified: true } : {}),
          } : {
            createdBy: user.id,
            createdAt: serverTimestamp(),
          }),
        };

        if (entry) {
          await updateDoc(doc(db, 'entries', entry.id), entryData);
          toast.success('Entry updated successfully');
        } else {
          await addDoc(collection(db, 'entries'), entryData);
          toast.success('Entry added successfully');
        }
        
        // Track category usage
        trackCategoryUsage(values.category as CategoryName, values.type);
        
        if (!entry) {
          setLastUsedCurrency(currency);
          addRecentCurrency(currency);
        }
        
        onSuccess?.();
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error(`Failed to ${entry ? 'update' : 'add'} entry`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          asChild
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{entry ? 'Edit Entry' : 'New Entry'}</h1>
      </div>
      
      <Card>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* entry Type Tabs */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="expense" className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Expense
                      </TabsTrigger>
                      <TabsTrigger value="income" className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4 text-primary" />
                        Income
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Currency & Amount */}
          <Controller
            name="amountCurrency"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <CurrencySelector
                      value={field.value.currency}
                      onChange={(currency) => field.onChange({ ...field.value, currency })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value.amount}
                      onChange={(e) => field.onChange({ ...field.value, amount: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                {fieldState.error && (
                  <FormMessage>
                    {fieldState.error.message || 
                     (fieldState.error as Record<string, { message?: string }>)?.amount?.message || 
                     (fieldState.error as Record<string, { message?: string }>)?.currency?.message}
                  </FormMessage>
                )}
              </FormItem>
            )}
          />

          {/* Category & Description */}
          <div className="space-y-2">
            <FormLabel>Details</FormLabel>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <CategorySelector
                        value={field.value}
                        onChange={field.onChange}
                        type={transactionType}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <div className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="Add an optional note..." 
                        type='text'
                        autoComplete='entry-description'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                )}
              />
            </div>
          </div>

          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isRecurring ? 'Start Date' : 'Date'}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 px-3 bg-transparent dark:bg-input/30 shadow-xs",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      startMonth={SERVICE_START_DATE}
                      disabled={{ before: SERVICE_START_DATE }}
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />



          {!entry && (
            <RecurringSection
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              recurringFrequency={recurringFrequency}
              setRecurringFrequency={setRecurringFrequency}
              endDate={endDate}
              setEndDate={setEndDate}
              selectedWeekdays={selectedWeekdays}
              setSelectedWeekdays={setSelectedWeekdays}
              interval={interval}
              setInterval={setInterval}
              selectedDate={watchedDate || new Date()}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              asChild
            >
              <Link href="/dashboard">
                Cancel
              </Link>
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (entry ? 'Update' : 'Save')}
            </Button>
          </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}