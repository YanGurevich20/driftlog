'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
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
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, RECURRENCE_LIMITS } from '@/types';
import type { Entry, RecurrenceFrequency } from '@/types';
import { useRouter } from 'next/navigation';
import { createRecurringTemplate } from '@/services/recurring';
import RecurringSection from '@/components/entry-form/recurrence-form';
import { SERVICE_START_DATE } from '@/lib/config';
import { Input } from '../ui/input';

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurrenceFrequency>('monthly');
  const [endDate, setEndDate] = useState<Date>(() => {
    return addMonths(new Date(), RECURRENCE_LIMITS.monthly.defaultMonths);
  });
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [interval, setInterval] = useState<number>(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry?.type || 'expense',
      amountCurrency: {
        amount: entry ? entry.originalAmount.toString() : '',
        currency: entry?.currency || lastUsedCurrency || 'USD',
      },
      category: entry?.category || 'Food & Dining',
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

  // Update category when entry type changes
  useEffect(() => {
    if (!entry) {
      // For new entries, set default category
      if (transactionType === 'income') {
        form.setValue('category', 'Salary');
      } else {
        form.setValue('category', 'Food & Dining');
      }
    } else {
      // For edit mode, check if current category exists in new type's categories
      const currentCategory = form.getValues('category');
      const availableCategories = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      
      // If current category doesn't exist in new type's categories, set a default
      if (!(availableCategories as readonly string[]).includes(currentCategory)) {
        const defaultCategory = transactionType === 'income' ? 'Salary' : 'Food & Dining';
        form.setValue('category', defaultCategory);
      }
    }
  }, [transactionType, form, entry]);

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

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
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

          {/* Amount & Currency */}
          <Controller
            name="amountCurrency"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                  />
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

          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <CategorySelector
                    value={field.value}
                    onChange={field.onChange}
                    categories={transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
                    placeholder="Select a category"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Add an optional note..." 
                    type='text'
                    autoComplete='entry-description'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
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