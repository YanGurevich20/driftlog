'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createRecurringTemplate } from '@/services/recurring';
import { usePreferences } from '@/store/preferences';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toUTCMidnight } from '@/lib/date-utils';
import type { CategoryName } from '@/types/category';
import { CATEGORY_NAMES } from '@/types/category';
import { useCategoryRanking } from '@/hooks/use-category-ranking';
import { useEntryAnimation } from '@/contexts/entry-animation-context';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { SERVICE_START_DATE } from '@/lib/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat } from 'lucide-react';
import type { RecurrenceFrequency } from '@/types/recurring';
import { RECURRENCE_LIMITS } from '@/types/recurring';
import { EntryType } from '@/types/entry';

const formSchema = z
  .object({
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
  isRecurring: z.boolean(),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1),
    endDate: z.date(),
    selectedWeekdays: z.array(z.number()).optional(),
  }).optional(),
})
.superRefine((data, ctx) => {
  if (!data.isRecurring) return;
  const frequency = data.recurrence?.frequency;
  if (frequency === 'weekly') {
    const days = data.recurrence?.selectedWeekdays ?? [];
    if (days.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: 'Select at least one day',
        path: ['recurrence', 'selectedWeekdays'],
      });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

interface EntryFormProps {
  onSuccess?: () => void;
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
}

export function EntryForm({ onSuccess, onDateChange, onEntryCreated }: EntryFormProps) {
  const { user } = useAuth();
  const { setAnimationData } = useEntryAnimation();
  const { lastUsedCurrency, setLastUsedCurrency, addRecentCurrency } = usePreferences();
  const { trackCategoryUsage, getDefaultCategory, recentCategories } = useCategoryRanking();

  const buildDefaultValues = (baseDate = new Date()) => ({
    type: 'expense' as EntryType,
    amountCurrency: {
      amount: '',
      currency: lastUsedCurrency || user?.displayCurrency || 'USD',
    },
    category: getDefaultCategory('expense'),
    description: '',
    date: baseDate,
    isRecurring: false,
    recurrence: {
      frequency: 'monthly' as RecurrenceFrequency,
      interval: 1,
      endDate: addMonths(baseDate, 12),
      selectedWeekdays: [],
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    reValidateMode: 'onSubmit',
    shouldFocusError: false,
    defaultValues: buildDefaultValues(),
  });

  const transactionType = form.watch('type');
  const isRecurring = form.watch('isRecurring');
  const selectedDate = form.watch('date') || new Date();

  // Update category when entry type changes
  React.useEffect(() => {
    const currentCategory = form.getValues('category');
    const smartDefault = getDefaultCategory(transactionType);
    
    const hasValidCategory = CATEGORY_NAMES.includes(currentCategory as CategoryName);
    const shouldUpdate = !hasValidCategory || currentCategory !== smartDefault;
    
    if (shouldUpdate) {
      form.setValue('category', smartDefault);
    }
  }, [transactionType, getDefaultCategory, form, recentCategories]);

  const clearForm = () => {
    const newDate = new Date();
    form.reset(buildDefaultValues(newDate));
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    try {
      const amount = parseFloat(values.amountCurrency.amount);
      const currency = values.amountCurrency.currency;
      const selectedDate = values.date || new Date();
      
      // Enforce service start date for selected date
      const selectedUtcDate = toUTCMidnight(selectedDate);
      if (selectedUtcDate < SERVICE_START_DATE) {
        toast.warning('Date cannot be before Jan 1, 2025');
        return;
      }

      if (values.isRecurring && values.recurrence) {
        // Create recurring template
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
            frequency: values.recurrence.frequency,
            interval: values.recurrence.interval,
            endDate: values.recurrence.endDate,
            ...(values.recurrence.frequency === 'weekly' && (values.recurrence.selectedWeekdays?.length ?? 0) > 0 && {
              daysOfWeek: values.recurrence.selectedWeekdays
            }),
            ...(values.recurrence.frequency === 'monthly' && {
              dayOfMonth: selectedDate.getDate()
            })
          },
          startDate: selectedUtcDate,
          createdBy: user.id,
        };

        await createRecurringTemplate(templateData);
        
        // Clear form and show success
        clearForm();
        onSuccess?.();
        toast.success('Recurring entry series created successfully');
        
        // Navigate to the start date to show the entries
        onDateChange?.(selectedDate);
      } else {
        // Create single entry
        const entryData = {
          type: values.type,
          userId: user.id,
          originalAmount: amount,
          currency,
          category: values.category,
          description: values.description || '',
          date: selectedUtcDate,
          createdBy: user.id,
          createdAt: serverTimestamp(),
        };

        // Pre-generate doc ID and announce creation before write to avoid UI race
        const colRef = collection(db, 'entries');
        const docRef = doc(colRef);

        // Pre-set animation state
        setAnimationData({
          entryId: docRef.id,
          date: selectedDate
        });

        // Automatically navigate to selected date
        onDateChange?.(selectedDate);
        
        // Trigger flash animation for the new entry
        onEntryCreated?.(docRef.id);
        
        // Perform the actual write
        await setDoc(docRef, entryData);

        // Clear the form
        clearForm();
        
        onSuccess?.();
        
      }
      
      // Track category usage
      trackCategoryUsage(values.category as CategoryName, values.type);
      
      setLastUsedCurrency(currency);
      addRecentCurrency(currency);
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error(values.isRecurring ? 'Failed to create recurring entry series' : 'Failed to add entry');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Entry Type Tabs */}
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <Tabs value={field.value} onValueChange={field.onChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Income
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />

      {/* Amount & Currency */}
      <Controller
        name="amountCurrency"
        control={form.control}
        render={({ field, fieldState }) => (
          <div className="space-y-2">
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
                onChange={(e) => {
                  if (fieldState.error) {
                    form.clearErrors('amountCurrency');
                  }
                  field.onChange({ ...field.value, amount: e.target.value });
                }}
                onFocus={() => {
                  if (fieldState.error) {
                    form.clearErrors('amountCurrency');
                  }
                }}
                className={`flex-1 ${(form.formState.errors.amountCurrency?.amount ? 'border-destructive' : '')}`}
                aria-invalid={!!form.formState.errors.amountCurrency?.amount}
              />
            </div>
          </div>
        )}
      />

      {/* Category & Description */}
      <div className="flex gap-2">
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <CategorySelector
              value={field.value}
              onChange={field.onChange}
              type={transactionType}
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Input
              placeholder="Add a note..."
              type="text"
              className="flex-1"
              {...field}
            />
          )}
        />
      </div>

      {/* Date & Recurrence Toggle */}
      <div className="flex gap-2">
        <Controller
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <Button
              type="button"
              variant={field.value ? "secondary" : "outline"}
              size="icon"
              onClick={() => field.onChange(!field.value)}
            >
              <Repeat />
            </Button>
          )}
        />
        <Controller
          control={form.control}
          name="date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-8 px-3 bg-transparent dark:bg-input/30 shadow-xs border dark:border-0",
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
          )}
        />
      </div>

      {/* Recurrence Fields */}
      {isRecurring && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">Every</span>
            <Controller
              control={form.control}
              name="recurrence.interval"
              render={({ field, fieldState }) => (
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={field.value === undefined || field.value === null || Number.isNaN(field.value) ? '' : String(field.value)}
                  onChange={(e) => {
                    if (fieldState.error) {
                      form.clearErrors('recurrence.interval');
                    }
                    const raw = e.target.value;
                    if (raw === '') {
                      // keep empty during typing; RHF will keep as ''
                      field.onChange('');
                    } else {
                      const parsed = Number(raw);
                      field.onChange(Number.isNaN(parsed) ? '' : parsed);
                    }
                  }}
                  onFocus={() => {
                    if (fieldState.error) {
                      form.clearErrors('recurrence.interval');
                    }
                  }}
                  className={`w-12 ${fieldState.error ? 'border-destructive' : ''}`}
                  aria-invalid={!!fieldState.error}
                />
              )}
            />
            <Controller
              control={form.control}
              name="recurrence.frequency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value: RecurrenceFrequency) => {
                    field.onChange(value);
                    const defaultEndDate = addMonths(selectedDate, RECURRENCE_LIMITS[value].defaultMonths);
                    form.setValue('recurrence.endDate', defaultEndDate);
                    if (!(value === "daily" || value === "weekly")) {
                      form.setValue('recurrence.selectedWeekdays', []);
                    }
                  }}
                >
                  <SelectTrigger className="w-28 border dark:border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{(form.watch('recurrence.interval') || 1) < 2 ? "day" : "days"}</SelectItem>
                    <SelectItem value="weekly">{(form.watch('recurrence.interval') || 1) < 2 ? "week" : "weeks"}</SelectItem>
                    <SelectItem value="monthly">{(form.watch('recurrence.interval') || 1) < 2 ? "month" : "months"}</SelectItem>
                    <SelectItem value="yearly">{(form.watch('recurrence.interval') || 1) < 2 ? "year" : "years"}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <span className="text-sm">Until</span>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="recurrence.endDate"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-8 px-3 bg-transparent dark:bg-input/30 shadow-xs border dark:border-0",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={{ 
                        before: selectedDate, 
                        after: addMonths(selectedDate, RECURRENCE_LIMITS[form.watch('recurrence.frequency') || 'monthly'].maxMonths) 
                      }}
                      captionLayout="dropdown"
                      startMonth={SERVICE_START_DATE}
                      endMonth={addMonths(selectedDate, RECURRENCE_LIMITS[form.watch('recurrence.frequency') || 'monthly'].maxMonths)}
                      defaultMonth={field.value}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {form.watch('recurrence.frequency') === 'weekly' && (
            <div className="space-y-2">
              <span className="text-sm">Days of week</span>
              <div className="flex gap-1 flex-wrap">
                {[
                  { label: "S", val: 0 },
                  { label: "M", val: 1 },
                  { label: "T", val: 2 },
                  { label: "W", val: 3 },
                  { label: "T", val: 4 },
                  { label: "F", val: 5 },
                  { label: "S", val: 6 },
                ].map(({ label, val }) => (
                  <Button
                    key={val}
                    type="button"
                    variant={(form.watch('recurrence.selectedWeekdays') || []).includes(val) ? "default" : "outline"}
                    className={`h-8 w-8 ${(form.formState.errors.recurrence?.selectedWeekdays ? 'ring-1 ring-inset ring-destructive' : '')}`}
                    onClick={() => {
                      const current = (form.getValues('recurrence.selectedWeekdays') || []);
                      const newWeekdays = current.includes(val)
                        ? current.filter((d) => d !== val)
                        : [...current, val].sort((a, b) => a - b);
                      form.setValue('recurrence.selectedWeekdays', newWeekdays);
                      if (newWeekdays.length > 0) {
                        form.clearErrors('recurrence.selectedWeekdays');
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'Adding...' : 'Add Entry'}
      </Button>
    </form>
  );
}