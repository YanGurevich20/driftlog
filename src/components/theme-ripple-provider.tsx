'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ThemeName = 'light' | 'dark' | 'system';

interface RippleOrigin {
  x: number;
  y: number;
}

interface ThemeRippleContextValue {
  animateThemeChange: (params: { nextTheme: ThemeName; origin: RippleOrigin; applyTheme: () => void }) => void;
}

const ThemeRippleContext = createContext<ThemeRippleContextValue | null>(null);

export function useThemeRipple(): ThemeRippleContextValue {
  const ctx = useContext(ThemeRippleContext);
  if (!ctx) {
    throw new Error('useThemeRipple must be used within ThemeRippleProvider');
  }
  return ctx;
}

export function ThemeRippleProvider({ children }: { children: React.ReactNode }) {
  const [overlayState, setOverlayState] = useState<
    | {
        active: true;
        origin: RippleOrigin;
        previousTheme: ThemeName;
        maxRadius: number;
        previousBackgroundColor: string;
      }
    | { active: false }
  >({ active: false });

  const timerRef = useRef<number | null>(null);

  const animateThemeChange = useCallback(
    ({ origin, applyTheme }: { nextTheme: ThemeName; origin: RippleOrigin; applyTheme: () => void }) => {
      const root = document.documentElement;
      const previousTheme: ThemeName = root.classList.contains('dark') ? 'dark' : 'light';

      // Compute the max radius to cover the viewport from origin
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const distances = [
        Math.hypot(origin.x - 0, origin.y - 0),
        Math.hypot(origin.x - vw, origin.y - 0),
        Math.hypot(origin.x - 0, origin.y - vh),
        Math.hypot(origin.x - vw, origin.y - vh),
      ];
      const maxRadius = Math.ceil(Math.max(...distances));

      // Prefer View Transitions API so old content stays visible while new theme reveals
      const docWithVT = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (typeof docWithVT.startViewTransition === 'function') {
        root.style.setProperty('--ripple-x', `${origin.x}px`);
        root.style.setProperty('--ripple-y', `${origin.y}px`);
        root.style.setProperty('--ripple-radius', `${maxRadius}px`);
        root.classList.add('theme-ripple-active');

        const transition = docWithVT.startViewTransition(() => {
          applyTheme();
        });

        transition?.finished.finally(() => {
          root.classList.remove('theme-ripple-active');
          root.style.removeProperty('--ripple-x');
          root.style.removeProperty('--ripple-y');
          root.style.removeProperty('--ripple-radius');
        });
        return;
      }

      // Fallback: overlay with previous theme background color
      const prevBg = getComputedStyle(root).getPropertyValue('--background').trim();
      setOverlayState({ active: true, origin, previousTheme, maxRadius, previousBackgroundColor: prevBg });
      applyTheme();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      const durationMs = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--theme-ripple-duration')
          .trim()
          .replace('ms', '') || '550',
        10
      );
      timerRef.current = window.setTimeout(() => {
        setOverlayState({ active: false });
        timerRef.current = null;
      }, isNaN(durationMs) ? 600 : durationMs + 20);
    },
    []
  );

  const value = useMemo<ThemeRippleContextValue>(() => ({ animateThemeChange }), [animateThemeChange]);

  return (
    <ThemeRippleContext.Provider value={value}>
      {children}
      {overlayState.active &&
        createPortal(
          <div
            className={
              overlayState.previousTheme === 'dark'
                ? 'theme-ripple-overlay dark'
                : 'theme-ripple-overlay'
            }
            style={
              {
                // Custom properties consumed by CSS for clip-path
                ['--ripple-x' as never]: `${overlayState.origin.x}px`,
                ['--ripple-y' as never]: `${overlayState.origin.y}px`,
                ['--ripple-radius' as never]: `${overlayState.maxRadius}px`,
                background: overlayState.previousBackgroundColor || 'var(--background)',
              } as React.CSSProperties
            }
            aria-hidden="true"
          />,
          document.body
        )}
    </ThemeRippleContext.Provider>
  );
}


