import * as React from "react"
import { cn } from "@/lib/utils"

interface IconContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

function IconContainer({ className, ...props }: IconContainerProps) {
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
