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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { CurrencyService } from '@/services/currency';
import { usePreferences } from '@/store/preferences';
import { useSpaceCurrency } from '@/hooks/use-space-currency';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import type { Entry } from '@/types';
import { useRouter } from 'next/navigation';

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
  const { currency: spaceBaseCurrency } = useSpaceCurrency(user?.defaultSpaceId);
  const { lastUsedCurrency, setLastUsedCurrency, addRecentCurrency } = usePreferences();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry?.type || 'expense',
      amountCurrency: {
        amount: entry ? entry.amount.toString() : '',
        currency: entry?.currency || lastUsedCurrency || 'USD',
      },
      category: entry?.category || 'Food & Dining',
      description: entry?.description || '',
      date: entry ? entry.date : new Date(),
    },
  });

  // Set initial currency
  useEffect(() => {
    // If no last used currency, set to space's base currency
    if (!lastUsedCurrency && !entry && spaceBaseCurrency) {
      form.setValue('amountCurrency.currency', spaceBaseCurrency);
    }
  }, [spaceBaseCurrency, lastUsedCurrency, form, entry]);

  const transactionType = form.watch('type');

  // Update category when transaction type changes
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

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Get space's base currency
      const spaceDoc = await getDoc(doc(db, 'spaces', user.defaultSpaceId));
      const baseCurrency = spaceDoc.exists() ? spaceDoc.data().baseCurrency : 'USD';
      
      // Convert to base currency
      const currencyService = CurrencyService.getInstance();
      const amount = parseFloat(values.amountCurrency.amount);
      const currency = values.amountCurrency.currency;
      let convertedAmount = amount;
      
      try {
        convertedAmount = await currencyService.convert(
          amount,
          currency,
          baseCurrency
        );
      } catch (conversionError) {
        console.error('Currency conversion failed:', conversionError);
        toast.error('Failed to convert currency. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const entryData = {
        type: values.type,
        amount,
        currency,
        convertedAmount,
        baseCurrency,
        category: values.category,
        description: values.description || '',
        spaceId: user.defaultSpaceId,
        date: values.date || new Date(),
        ...(entry ? {
          updatedBy: user.id,
          updatedAt: serverTimestamp(),
        } : {
          createdBy: user.id,
          createdAt: serverTimestamp(),
        }),
        ...(values.type === 'expense' && { payerId: user.id }),
        ...(values.type === 'income' && { source: values.category }),
      };

      if (entry) {
        await updateDoc(doc(db, 'entries', entry.id), entryData);
        toast.success('Entry updated successfully');
      } else {
        await addDoc(collection(db, 'entries'), entryData);
        toast.success('Entry added successfully');
      }
      
      // Remember the currency for next time (only for new entries)
      if (!entry) {
        setLastUsedCurrency(currency);
        addRecentCurrency(currency);
      }
      
      onSuccess?.();
      router.push('/dashboard');
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
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Transaction Type Tabs */}
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {(transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
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
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add a note..." 
                    className="resize-none h-20"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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