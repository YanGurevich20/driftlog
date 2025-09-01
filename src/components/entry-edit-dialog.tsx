'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SERVICE_START_DATE } from '@/lib/config';
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { updateEntry } from '@/services/entries';
import { toast } from 'sonner';
import type { Entry } from '@/types';

const editSchema = z.object({
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
  date: z.date(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EntryEditDialogProps {
  entry: Entry;
  onSuccess?: () => void;
}

export function EntryEditDialog({ entry, onSuccess }: EntryEditDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      amountCurrency: {
        amount: entry.originalAmount.toString(),
        currency: entry.currency,
      },
      category: entry.category,
      description: entry.description || '',
      date: entry.date,
    },
  });

  const onSubmit = async (values: EditFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(values.amountCurrency.amount);
      const updates = {
        originalAmount: amount,
        currency: values.amountCurrency.currency,
        category: values.category,
        description: values.description || '',
        date: values.date,
        isModified: true,
      };

      await updateEntry(entry.id, updates, user.id);
      
      toast.success('Entry updated');
      onSuccess?.();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Entry</DialogTitle>
        <DialogDescription>
          Make changes to your entry here. Click save when you&apos;re done.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 py-4">
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
                    onChange={(e) => field.onChange({ ...field.value, amount: e.target.value })}
                    className="flex-1"
                  />
                </div>
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {fieldState.error.message || 
                     (fieldState.error as Record<string, { message?: string }>)?.amount?.message || 
                     (fieldState.error as Record<string, { message?: string }>)?.currency?.message}
                  </p>
                )}
              </div>
            )}
          />

          <div className="flex gap-2">
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <CategorySelector
                  value={field.value}
                  onChange={field.onChange}
                  type={entry.type}
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

          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
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

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}