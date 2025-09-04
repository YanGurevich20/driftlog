import * as React from "react"
import { cn } from "@/lib/utils"

function IconContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "size-8 flex items-center justify-center rounded-md bg-accent shadow-xs dark:bg-input/30 dark:border-input",
        className
      )}
      {...props}
    />
  )
}

export { IconContainer }
