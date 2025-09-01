'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { useAuth } from '@/lib/auth-context';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { getCategoriesByAffiliation } from '@/types/categories';
import type { BudgetAllocation } from '@/types';

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
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
    const usedCategories = allocations.map(a => a.category);
    
    // When editing, allow the current category to be selected
    return editAllocation 
      ? usedCategories.filter(cat => cat !== editAllocation.category)
      : usedCategories;
  }, [allocations, editAllocation]);

  const defaultCategory = useMemo(() => {
    if (editAllocation) return editAllocation.category;
    
    const allCategories = getCategoriesByAffiliation('expense');
    return allCategories.find(cat => !disabledCategories.includes(cat)) || '';
  }, [editAllocation, disabledCategories]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: defaultCategory,
      amount: editAllocation?.amount?.toString() || '',
      currency: editAllocation?.currency || user?.displayCurrency || 'USD',
    },
  });

  // Only handle edit mode
  useEffect(() => {
    if (editAllocation) {
      form.reset({
        category: editAllocation.category,
        amount: editAllocation.amount.toString(),
        currency: editAllocation.currency,
      });
      setOpen(true);
    }
  }, [editAllocation, form]);

  // Reset form when dialog opens for new allocation
  useEffect(() => {
    if (open && !editAllocation && disabledCategories) {
      const allCategories = getCategoriesByAffiliation('expense');
      const firstAvailable = allCategories.find(cat => !disabledCategories.includes(cat));
      if (firstAvailable) {
        console.log('🔄 RESETTING FORM with category:', firstAvailable);
        form.reset({
          category: firstAvailable,
          amount: '',
          currency: user?.displayCurrency || 'USD',
        });
      }
    }
  }, [open, editAllocation, disabledCategories, form, user?.displayCurrency]);

  const handleClose = () => {
    setOpen(false);
    if (editAllocation && onEditClose) {
      onEditClose();
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!user?.id) return;

    console.log('💾 SUBMITTING BUDGET:', values);
    console.log('  Current allocations before submit:', allocations.length);

    setIsSubmitting(true);
    try {
      if (editAllocation) {
        await updateAllocation(editAllocation.id, {
          category: values.category,
          amount: parseFloat(values.amount),
          currency: values.currency,
        });
        toast.success('Budget allocation updated');
      } else {
        await createAllocation({
          userId: user.id,
          category: values.category,
          amount: parseFloat(values.amount),
          currency: values.currency,
        });
        toast.success('Budget allocation created');
        console.log('✅ Budget created successfully');
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
        <CategorySelector
          value={form.watch('category')}
          onChange={(value) => form.setValue('category', value)}
          type="expense"
          disabledCategories={disabledCategories}
        />
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          className="flex-1"
          {...form.register('amount')}
        />
        <CurrencySelector
          value={form.watch('currency')}
          onChange={(value) => form.setValue('currency', value)}
        />
      </div>

      {(form.formState.errors.category || form.formState.errors.amount || form.formState.errors.currency) && (
        <div className="text-sm text-destructive">
          {form.formState.errors.category?.message ||
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
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      {!editAllocation && (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
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