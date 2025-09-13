'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useThemeRipple } from '@/components/theme-ripple-provider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'radio';
  buttonClassName?: string;
}

export function ThemeToggle({ variant = 'dropdown', buttonClassName }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { animateThemeChange } = useThemeRipple();

  const setThemeWithRipple = (next: 'light' | 'dark' | 'system') => (e: React.MouseEvent) => {
    const origin = { x: e.clientX, y: e.clientY };
    animateThemeChange({
      nextTheme: next,
      origin,
      applyTheme: () => setTheme(next),
    });
  };

  if (variant === 'radio') {
    return (
      <RadioGroup value={theme} onValueChange={setTheme}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
            <Sun className="h-4 w-4" />
            Light
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
            <Moon className="h-4 w-4" />
            Dark
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
            <Monitor className="h-4 w-4" />
            System
          </Label>
        </div>
      </RadioGroup>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className={buttonClassName}>
          {theme === 'system' ? (
            <Monitor className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={setThemeWithRipple('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={setThemeWithRipple('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={setThemeWithRipple('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}