"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { cn } from "@/lib/utils"

export function Carousel({ className, children }: React.ComponentProps<"div">) {
  return <div className={cn("relative", className)}>{children}</div>
}

export function CarouselContent({ className, children }: React.ComponentProps<"div">) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex -ml-4">{children}</div>
    </div>
  )
}

export function CarouselItem({ className, children }: React.ComponentProps<"div">) {
  return (
    <div className={cn("min-w-0 shrink-0 basis-full pl-4", className)}>
      {children}
    </div>
  )
}

export function useCarousel(options?: Parameters<typeof useEmblaCarousel>[0]) {
  const [viewportRef, api] = useEmblaCarousel(options)
  return { viewportRef, api }
}

export function CarouselPrevious(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Previous"
      {...props}
      className={cn(
        "absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur px-3 py-2 text-sm shadow",
        props.className
      )}
    >
      ‹
    </button>
  )
}

export function CarouselNext(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Next"
      {...props}
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur px-3 py-2 text-sm shadow",
        props.className
      )}
    >
      ›
    </button>
  )
}


