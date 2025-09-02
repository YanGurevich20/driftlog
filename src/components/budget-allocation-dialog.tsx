'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiCategorySelector } from '@/components/ui/multi-category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { useAuth } from '@/lib/auth-context';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { getCategoriesByAffiliation } from '@/types/categories';
import type { BudgetAllocation } from '@/types';

const formSchema = z.object({
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface BudgetAllocationDialogProps {
  editAllocation?: BudgetAllocation | null;
  onEditClose?: () => void;
}

export function BudgetAllocationDialog({ editAllocation, onEditClose }: BudgetAllocationDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(!!editAllocation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { allocations, createAllocation, updateAllocation } = useBudgetAllocations();

  const disabledCategories = useMemo(() => {
    const usedCategories = allocations.flatMap(a => a.categories);
    
    // When editing, allow the current categories to be selected
    return editAllocation 
      ? usedCategories.filter(cat => !editAllocation.categories.includes(cat))
      : usedCategories;
  }, [allocations, editAllocation]);

  const defaultCategories = useMemo(() => {
    if (editAllocation) return editAllocation.categories;
    return [];
  }, [editAllocation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categories: defaultCategories,
      amount: editAllocation?.amount?.toString() || '',
      currency: editAllocation?.currency || user?.displayCurrency || 'USD',
    },
  });

  // Only handle edit mode
  useEffect(() => {
    if (editAllocation) {
      form.reset({
        categories: editAllocation.categories,
        amount: editAllocation.amount.toString(),
        currency: editAllocation.currency,
      });
      setOpen(true);
    }
  }, [editAllocation, form]);

  // Reset form when dialog opens for new allocation
  useEffect(() => {
    if (open && !editAllocation) {
      form.reset({
        categories: [],
        amount: '',
        currency: user?.displayCurrency || 'USD',
      });
    }
  }, [open, editAllocation, form, user?.displayCurrency]);

  const handleClose = () => {
    setOpen(false);
    if (editAllocation && onEditClose) {
      onEditClose();
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      if (editAllocation) {
        await updateAllocation(editAllocation.id, {
          categories: values.categories,
          amount: parseFloat(values.amount),
          currency: values.currency,
        });
        toast.success('Budget allocation updated');
      } else {
        await createAllocation({
          userId: user.id,
          categories: values.categories,
          amount: parseFloat(values.amount),
          currency: values.currency,
        });
        toast.success('Budget allocation created');
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save budget allocation:', error);
      toast.error(`Failed to ${editAllocation ? 'update' : 'create'} budget allocation`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const DialogForm = (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="flex items-center gap-3">
        <MultiCategorySelector
          value={form.watch('categories')}
          onChange={(categories) => form.setValue('categories', categories)}
          type="expense"
          disabledCategories={disabledCategories}
          maxItems={4}
          className="flex-1"
        />
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          className="w-20"
          {...form.register('amount')}
        />
        <CurrencySelector
          value={form.watch('currency')}
          onChange={(value) => form.setValue('currency', value)}
        />
      </div>

      {(form.formState.errors.categories || form.formState.errors.amount || form.formState.errors.currency) && (
        <div className="text-sm text-destructive">
          {form.formState.errors.categories?.message ||
           form.formState.errors.amount?.message ||
           form.formState.errors.currency?.message}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? (editAllocation ? 'Updating...' : 'Creating...')
            : (editAllocation ? 'Update' : 'Create')
          }
        </Button>
      </DialogFooter>
    </form>
  );

  if (!editAllocation && getCategoriesByAffiliation('expense').every(cat => disabledCategories.includes(cat))) {
    return (
      <Button variant="ghost" size="icon" disabled title="All categories already have budget allocations">
        <Plus />
      </Button>
    );
  }

  return (
    <>
      {!editAllocation && (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Plus />
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editAllocation ? 'Edit Budget' : 'Add a Budget'}
            </DialogTitle>
          </DialogHeader>
          {DialogForm}
        </DialogContent>
      </Dialog>
    </>
  );
}