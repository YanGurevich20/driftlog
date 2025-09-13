'use client';

import { useAuth } from '@/lib/auth-context';
import { REGISTRATIONS_CLOSED } from '@/lib/config';
import WaitlistForm from '@/components/waitlist-form';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useIsDesktop } from '@/hooks/use-media-query';
import Link from 'next/link';
import { LANDING_FEATURES, type LandingFeature } from '@/lib/landing-features';
import { LoadingState } from '@/components/ui/loading-state';

// Wide chevron icon for mobile hero
function WideChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 12"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2 2 L12 10 L22 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const { user, loading, signInWithGoogle, needsOnboarding } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const featureRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSnappingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const DEBUG = false;
  const lastSnapAtRef = useRef<number>(0);
  const lastSeekIndexRef = useRef<number>(-1);
  const [beforeFirst, setBeforeFirst] = useState(true);
  const onTimeUpdateRef = useRef<((this: HTMLVideoElement, ev: Event) => void) | null>(null);
  const lastLoopAtRef = useRef<number>(0);
  const isDesktop = useIsDesktop();
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
  const mobileItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  function log(...args: unknown[]) {
    if (DEBUG) console.log('[landing]', ...args);
  }

  function getFeatureTop(index: number): number | null {
    const el = featureRefs.current[index];
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY;
  }

  function animateScrollTo(targetY: number, durationMs = 350) {
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 1) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const start = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      function step(now: number) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeOutCubic(t);
        window.scrollTo(0, startY + delta * eased);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function snapToIndex(index: number) {
    const top = getFeatureTop(index);
    if (top == null) return;
    isSnappingRef.current = true;
    lastSnapAtRef.current = Date.now();
    log('snapToIndex', index);
    await animateScrollTo(top, 320);
    // Small buffer to avoid immediate re-trigger
    setTimeout(() => {
      isSnappingRef.current = false;
    }, 120);
  }
  const displayRef = useRef<HTMLDivElement | null>(null);
  const [displayHeight, setDisplayHeight] = useState(0);

  const FEATURES: LandingFeature[] = useMemo(() => LANDING_FEATURES, []);

  useEffect(() => {
    if (!loading && user) {
      if (needsOnboarding) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, needsOnboarding, router]);

  // Enable landing scroll snapping on body while this page is mounted
  useEffect(() => {
    document.body.classList.add('landing-snap');
    return () => {
      document.body.classList.remove('landing-snap');
    };
  }, []);

  // Active index updates are handled via IntersectionObserver below

  // IntersectionObserver: update active index based on which feature is crossing viewport center
  useEffect(() => {
    if (!isDesktop) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      () => {
        // recompute nearest to center when any observation changes
        const centerY = window.innerHeight / 2;
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        featureRefs.current.forEach((el, idx) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height / 2;
          const distance = Math.abs(elCenter - centerY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = idx;
          }
        });
        if (!isSnappingRef.current && Date.now() - lastSnapAtRef.current >= 300) {
          if (nearestIndex !== activeFeatureIndex) {
            log('io -> index', nearestIndex);
            setActiveFeatureIndex(nearestIndex);
          }
        }
      },
      { root: null, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    featureRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, FEATURES.length]);

  // Wheel-driven snapping between items
  useEffect(() => {
    if (!isDesktop) return;
    const onWheel = (e: WheelEvent) => {
      if (isSnappingRef.current) {
        e.preventDefault();
        return;
      }
      const delta = e.deltaY;
      if (Math.abs(delta) < 20) return; // ignore tiny scrolls
      const direction = delta > 0 ? 1 : -1;
      // Respect cooldown to prevent rapid multi-advance
      if (Date.now() - lastSnapAtRef.current < 400) {
        e.preventDefault();
        return;
      }

      // If we're still in the hero and the user scrolls down once, snap to the first item
      if (beforeFirst && direction > 0) {
        e.preventDefault();
        log('wheel -> snap to first (from hero)');
        setActiveFeatureIndex(0);
        void snapToIndex(0);
        return;
      }

      let next = activeFeatureIndex + direction;

      // Special case: coming from hero to first item, always snap to index 0 first
      const firstTop = getFeatureTop(0);
      if (firstTop != null && window.scrollY < firstTop - 40 && direction > 0) {
        next = 0;
      }

      next = Math.min(FEATURES.length - 1, Math.max(0, next));
      if (next === activeFeatureIndex) return;

      e.preventDefault();
      log('wheel -> snap to', next);
      setActiveFeatureIndex(next);
      void snapToIndex(next);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeatureIndex, FEATURES.length, DEBUG, beforeFirst, isDesktop]);

  // Keyboard snapping (ArrowDown / PageDown / Space) to support first jump from hero
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSnappingRef.current) {
        e.preventDefault();
        return;
      }
      const isDown = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
      const isUp = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
      if (!isDown && !isUp) return;
      if (Date.now() - lastSnapAtRef.current < 400) {
        e.preventDefault();
        return;
      }

      if (beforeFirst && isDown) {
        e.preventDefault();
        log('keydown -> snap to first (from hero)');
        setActiveFeatureIndex(0);
        void snapToIndex(0);
        return;
      }

      const direction = isDown ? 1 : -1;
      const next = Math.min(
        FEATURES.length - 1,
        Math.max(0, activeFeatureIndex + direction)
      );
      if (next === activeFeatureIndex) return;
      e.preventDefault();
      log('keydown -> snap to', next);
      setActiveFeatureIndex(next);
      void snapToIndex(next);
    };

    window.addEventListener('keydown', onKeyDown, { passive: false } as AddEventListenerOptions);
    return () => window.removeEventListener('keydown', onKeyDown as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeatureIndex, FEATURES.length, DEBUG, beforeFirst, isDesktop]);

  // Mobile carousel scroll listener: update active index based on horizontal position
  useEffect(() => {
    if (isDesktop) return;
    const el = mobileCarouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const centerX = window.innerWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      mobileItemRefs.current.forEach((item, idx) => {
        if (!item) return;
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const distance = Math.abs(itemCenter - centerX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = idx;
        }
      });
      if (nearestIndex !== activeFeatureIndex) {
        setActiveFeatureIndex(nearestIndex);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Initial sync
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [isDesktop, activeFeatureIndex]);

  // Seek the single video to the start of the active segment
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (beforeFirst) {
      try { video.pause(); } catch {}
      return;
    }
    // Avoid double seeks to the same index
    if (lastSeekIndexRef.current === activeFeatureIndex) return;
    lastSeekIndexRef.current = activeFeatureIndex;
    const start = FEATURES[activeFeatureIndex]?.startTime ?? 0;
    const seek = () => {
      try {
        video.currentTime = start;
        void video.play();
      } catch {
        // no-op
      }
    };

    if (video.readyState >= 1) {
      seek();
    } else {
      const onLoaded = () => {
        seek();
        video.removeEventListener('loadedmetadata', onLoaded);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      return () => video.removeEventListener('loadedmetadata', onLoaded);
    }
  }, [activeFeatureIndex, beforeFirst, FEATURES]);

  // Constrain playback to current segment (loop within segment)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous handler
    if (onTimeUpdateRef.current) {
      video.removeEventListener('timeupdate', onTimeUpdateRef.current);
      onTimeUpdateRef.current = null;
    }

    if (beforeFirst) return;

    const start = FEATURES[activeFeatureIndex]?.startTime ?? 0;
    const nextStart = FEATURES[activeFeatureIndex + 1]?.startTime;
    const epsilon = 0.04; // ~2-3 frames at 60fps

    const handler = () => {
      // If last segment, loop to video end (duration) back to start
      const end = typeof nextStart === 'number'
        ? Math.max(nextStart - epsilon, start + epsilon)
        : Math.max((video.duration || start + 5) - epsilon, start + epsilon);
      if (video.currentTime >= end) {
        // Debounce repeated loops triggered by multiple timeupdates around the boundary
        const now = Date.now();
        if (now - lastLoopAtRef.current > 80) {
          lastLoopAtRef.current = now;
          // Jump slightly after start to avoid immediate re-trigger at exact keyframe boundary
          video.currentTime = start + 0.001;
          if (video.paused) {
            void video.play();
          }
        }
      }
    };

    onTimeUpdateRef.current = handler;
    video.addEventListener('timeupdate', handler);
    return () => {
      video.removeEventListener('timeupdate', handler);
      onTimeUpdateRef.current = null;
    };
  }, [activeFeatureIndex, beforeFirst, FEATURES]);

  // Track if viewport is before the first feature (in hero area)
  useEffect(() => {
    const updateBeforeFirst = () => {
      const firstTop = featureRefs.current[0]
        ? (featureRefs.current[0] as HTMLElement).getBoundingClientRect().top + window.scrollY
        : 0;
      // Consider entering the first item sooner (when top is within 40% viewport)
      const threshold = window.innerHeight * 0.6; // start playing when first item is within top 60% of viewport
      setBeforeFirst(window.scrollY + threshold < firstTop);
    };
    updateBeforeFirst();
    const onScroll = () => updateBeforeFirst();
    const onResize = () => updateBeforeFirst();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Track sticky display height to size items equally to the player
  useEffect(() => {
    const el = videoRef.current?.parentElement as HTMLDivElement | null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextHeight = Math.round(entry.contentRect.height);
      if (nextHeight !== displayHeight) setDisplayHeight(nextHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingState variant="card" className="w-full max-w-md" />
      </div>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section className="min-h-[100svh] snap-start">
        <div className="container mx-auto px-4 h-[100svh] flex flex-col">
          <div className="flex-1 min-h-[85svh] flex items-center">
            <div className="max-w-4xl">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
                DriftLog
              </h1>
              <p className="ml-2 mt-6 text-2xl sm:text-3xl text-muted-foreground">
                Because Excel just doesn&apos;t cut it anymore
              </p>

              <div className="mt-10 max-w-md grid grid-cols-[1fr_auto] items-center gap-2 w-full">
                {REGISTRATIONS_CLOSED ? (
                  <WaitlistForm />
                ) : (
                  <>
                    <Button
                      onClick={async () => {
                        setIsSigningIn(true);
                        try {
                          await signInWithGoogle();
                        } catch {
                          setIsSigningIn(false);
                        }
                      }}
                      size="lg"
                      className="w-full"
                      disabled={isSigningIn}
                    >
                      {isSigningIn ? 'Signing in...' : 'Continue with Google'}
                    </Button>
                    <ThemeToggle buttonClassName="size-10 shrink-0" />
                  </>
                )}
              </div>
              {!REGISTRATIONS_CLOSED && (
                <p className="mt-3 text-xs text-muted-foreground">
                  By signing in, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-foreground">
                    ToS
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div
            className="h-[18svh] sm:h-[15svh] flex flex-col items-center justify-center text-muted-foreground cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveFeatureIndex(0);
              void snapToIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveFeatureIndex(0);
                void snapToIndex(0);
              }
            }}
          >
            <span className="text-sm">see what we got</span>
            <WideChevronDown className="mt-2 animate-chevron-slow w-10 h-5" />
          </div>
        </div>
      </section>
      {/* Desktop Features with bounded sticky column */}
      {isDesktop && (
        <section className="container mx-auto px-4 overflow-visible">
          <div className="grid grid-cols-2 gap-12 overflow-visible">
            <div className="flex flex-col">
              {FEATURES.map((feature, index) => (
                <article
                  key={feature.id}
                  ref={(el) => {
                    featureRefs.current[index] = el;
                  }}
                  data-index={index}
                  className="h-[100svh] snap-start"
                >
                  <div className="h-full flex items-start pt-28">
                    <div className="mt-4 md:mt-8">
                      <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      {feature.description.map((line, i) => (
                        <p
                          key={i}
                          className={
                            i === 0
                              ? 'mt-3 text-muted-foreground text-lg max-w-prose'
                              : 'mt-1 text-muted-foreground text-lg max-w-prose'
                          }
                        >
                          {line}
                        </p>
                      ))}
                      {index === FEATURES.length - 1 && (
                        <div className="mt-8">
                          <Button
                            onClick={async () => {
                              setIsSigningIn(true);
                              try {
                                await signInWithGoogle();
                              } catch {
                                setIsSigningIn(false);
                              }
                            }}
                            size="lg"
                            disabled={isSigningIn}
                          >
                            {isSigningIn ? 'Signing in...' : 'Get started with Google'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Right: Sticky 9:16 video (single reel) */}
            <div ref={displayRef} className="sticky top-24 w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl border border-border/60 bg-background/40 backdrop-blur-md shadow-xl overflow-hidden">
              <video
                ref={videoRef}
                src="/media/features/features.mp4"
                className="h-full w-full object-cover"
                autoPlay={!beforeFirst}
                muted
                playsInline
                preload="auto"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
            </div>
          </div>
        </section>
      )}

      {/* Mobile variant: centered player + horizontal carousel */}
      {!isDesktop && (
        <section className="container mx-auto px-4">
          <div className="py-16">
            <div className="w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl border border-border/60 bg-background/40 backdrop-blur-md shadow-xl overflow-hidden">
              <video
                ref={videoRef}
                src="/media/features/features.mp4"
                className="h-full w-full object-cover"
                autoPlay={!beforeFirst}
                muted
                playsInline
                preload="auto"
              />
            </div>
          </div>
          <div
            ref={mobileCarouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4"
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                ref={(el) => {
                  mobileItemRefs.current[i] = el;
                }}
                className="snap-center shrink-0 basis-[85%]"
                onClick={() => setActiveFeatureIndex(i)}
              >
                <h4 className="text-xl font-semibold">{f.title}</h4>
                {f.description.map((line, li) => (
                  <p key={li} className="mt-2 text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}