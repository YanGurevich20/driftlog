'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, TrendingUp, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toDate } from '@/lib/date-utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import type { Entry } from '@/types';

const formSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountCurrency: z.object({
    amount: z.string().min(1, 'Amount is required'),
    currency: z.string().min(1, 'Currency is required'),
  }),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EntryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editEntry?: Partial<Entry> & { id: string };
}

export function EntryModal({ open, onClose, onSuccess, editEntry }: EntryModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spaceBaseCurrency, setSpaceBaseCurrency] = useState<string>('USD');
  const { lastUsedCurrency, setLastUsedCurrency, addRecentCurrency, recentCurrencies } = usePreferences();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editEntry ? {
      type: editEntry.type || 'expense',
      amountCurrency: {
        amount: editEntry.amount?.toString() || '',
        currency: editEntry.currency || 'USD',
      },
      category: editEntry.category || 'Food & Dining',
      description: editEntry.description || '',
      date: toDate(editEntry.date) || new Date(),
    } : {
      type: 'expense',
      amountCurrency: {
        amount: '',
        currency: lastUsedCurrency || spaceBaseCurrency,
      },
      category: 'Food & Dining',
      description: '',
      date: new Date(),
    },
  });

  // Fetch space's base currency when modal opens
  useEffect(() => {
    const fetchSpaceCurrency = async () => {
      if (user?.defaultSpaceId && open) {
        const spaceDoc = await getDoc(doc(db, 'spaces', user.defaultSpaceId));
        if (spaceDoc.exists()) {
          const baseCurrency = spaceDoc.data().baseCurrency || 'USD';
          setSpaceBaseCurrency(baseCurrency);
          
          // If no last used currency, set to space's base currency
          if (!lastUsedCurrency) {
            form.setValue('amountCurrency.currency', baseCurrency);
          }
        }
      }
    };
    fetchSpaceCurrency();
  }, [user?.defaultSpaceId, open, lastUsedCurrency, form]);

  const transactionType = form.watch('type');

  // Update category when transaction type changes
  useEffect(() => {
    if (!editEntry) {
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
  }, [transactionType, form, editEntry]);

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
        toast.warning('Currency conversion failed. Saving with original amount.');
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
        ...(editEntry ? {
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        } : {
          createdBy: user.id,
          createdAt: serverTimestamp(),
        }),
        ...(values.type === 'expense' && { payerId: user.id }),
        ...(values.type === 'income' && { source: values.category }),
      };

      if (editEntry) {
        await updateDoc(doc(db, 'entries', editEntry.id), entryData);
      } else {
        await addDoc(collection(db, 'entries'), entryData);
      }
      
      // Remember the currency for next time (only for new entries)
      if (!editEntry) {
        setLastUsedCurrency(currency);
        addRecentCurrency(currency);
        
        form.reset({
          type: 'expense',
          amountCurrency: {
            amount: '',
            currency: currency, // Keep the same currency for next transaction
          },
          category: 'Food & Dining',
          description: '',
          date: new Date(),
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit Entry' : 'New Entry'}</DialogTitle>
        </DialogHeader>
        
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
                          <TrendingDown className="h-4 w-4" />
                          Expense
                        </TabsTrigger>
                        <TabsTrigger value="income" className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Income
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Currency */}
            <FormField
              control={form.control}
              name="amountCurrency"
              render={() => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Controller
                      control={form.control}
                      name="amountCurrency"
                      render={({ field }) => (
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="0.00"
                          recentCurrencies={recentCurrencies}
                        />
                      )}
                    />
                  </FormControl>
                  <FormMessage />
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
                <FormItem className="flex flex-col">
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
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Today</span>}
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
                        initialFocus
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
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={transactionType === 'expense' ? 'What was this for?' : 'Source of income'}
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editEntry ? 'Updating...' : 'Adding...') : 
                 editEntry ? 'Update Entry' : `Add ${transactionType === 'expense' ? 'Expense' : 'Income'}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}