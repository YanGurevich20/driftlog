'use client';

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronUp } from "lucide-react";

interface CollapsibleCardProps {
  children?: React.ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
  hideFooterWhenCollapsed?: boolean;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface CollapsibleCardHeaderProps {
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

interface CollapsibleCardContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface CollapsibleCardFooterProps {
  children?: React.ReactNode;
  className?: string;
}

interface CollapsibleCardTitleProps {
  children?: React.ReactNode;
  className?: string;
}

const CollapsibleCardContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  hideFooterWhenCollapsed: boolean;
}>({
  isOpen: true,
  setIsOpen: () => {},
  hideFooterWhenCollapsed: true,
});

function useCollapsibleCard() {
  const context = React.useContext(CollapsibleCardContext);
  if (!context) {
    throw new Error("useCollapsibleCard must be used within a CollapsibleCard");
  }
  return context;
}

function CollapsibleCard({
  children,
  className,
  defaultCollapsed = false,
  hideFooterWhenCollapsed = true,
  collapsed: collapsedProp,
  setCollapsed: setCollapsedProp,
  onCollapsedChange,
  ...props
}: CollapsibleCardProps) {
  const isControlled = typeof collapsedProp === 'boolean';
  const [internalOpen, setInternalOpen] = React.useState(!defaultCollapsed);
  const isOpen = isControlled ? !collapsedProp! : internalOpen;

  React.useEffect(() => {
    if (!isControlled) {
      setInternalOpen(!defaultCollapsed);
    }
  }, [defaultCollapsed, isControlled]);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (isControlled) {
      const nextCollapsed = !nextOpen;
      onCollapsedChange?.(nextCollapsed);
      setCollapsedProp?.(nextCollapsed);
    } else {
      setInternalOpen(nextOpen);
    }
  }, [isControlled, onCollapsedChange, setCollapsedProp]);

  return (
    <CollapsibleCardContext.Provider value={{ isOpen, setIsOpen: handleOpenChange, hideFooterWhenCollapsed }}>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <Card className={className} {...props}>
          {children}
        </Card>
      </Collapsible>
    </CollapsibleCardContext.Provider>
  );
}

function CollapsibleCardHeader({ 
  children, 
  className,
  actions,
  ...props 
}: CollapsibleCardHeaderProps) {
  const { isOpen } = React.useContext(CollapsibleCardContext);

  return (
    <CardHeader className={cn(
      className,
      !isOpen && "border-b-0 dark:border-b-0"
    )} {...props}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between w-full cursor-pointer group">
          <div className="flex-1 flex items-center min-h-8">
            {children}
          </div>
          <div className="flex items-center gap-2">
            {actions && (
              <div 
                className="flex items-center gap-2" 
                onClick={(e) => e.stopPropagation()}
              >
                {actions}
              </div>
            )}
            <ChevronUp 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !isOpen && "-rotate-180"
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>
    </CardHeader>
  );
}

function CollapsibleCardTitle({ 
  children, 
  className,
  ...props 
}: CollapsibleCardTitleProps) {
  return (
    <CardTitle className={className} {...props}>
      {children}
    </CardTitle>
  );
}

function CollapsibleCardContent({ 
  children, 
  className,
  ...props 
}: CollapsibleCardContentProps) {
  return (
    <CollapsibleContent
      className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down duration-200 ease-out"
    >
      <CardContent className={className} {...props}>
        {children}
      </CardContent>
    </CollapsibleContent>
  );
}

function CollapsibleCardFooter({ 
  children, 
  className,
  ...props 
}: CollapsibleCardFooterProps) {
  const { hideFooterWhenCollapsed } = React.useContext(CollapsibleCardContext);

  if (hideFooterWhenCollapsed) {
    return (
      <CollapsibleContent
        className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down duration-200 ease-out"
      >
        <CardFooter className={className} {...props}>
          {children}
        </CardFooter>
      </CollapsibleContent>
    );
  }

  return (
    <CardFooter className={className} {...props}>
      {children}
    </CardFooter>
  );
}

export { 
  CollapsibleCard, 
  CollapsibleCardHeader, 
  CollapsibleCardTitle,
  CollapsibleCardContent, 
  CollapsibleCardFooter,
  useCollapsibleCard
};