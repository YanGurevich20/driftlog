'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { CurrencySelector } from '@/components/currency-selector';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: { amount: string; currency: string };
  onChange: (value: { amount: string; currency: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  recentCurrencies?: string[];
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0.00',
  disabled = false,
  className,
}: CurrencyInputProps) {

  return (
    <div className={cn('flex gap-2', className)}>
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder={placeholder}
        value={value.amount}
        onChange={(e) => {
          // Prevent negative values
          const newValue = e.target.value;
          // if (newValue === '' || parseFloat(newValue) >= 0) {
            onChange({ ...value, amount: newValue });
          // }
        }}
        disabled={disabled}
        className="flex-1"
      />
      
      <CurrencySelector
        value={value.currency}
        onChange={(currency) => onChange({ ...value, currency })}
      />
    </div>
  );
}