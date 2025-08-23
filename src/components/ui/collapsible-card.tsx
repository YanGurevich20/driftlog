'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronUp } from "lucide-react";

interface CollapsibleCardProps {
  children?: React.ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
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
}>({
  isOpen: true,
  setIsOpen: () => {},
});

function CollapsibleCard({ 
  children, 
  className,
  defaultCollapsed = false,
  ...props 
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = React.useState(!defaultCollapsed);

  return (
    <CollapsibleCardContext.Provider value={{ isOpen, setIsOpen }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
      className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
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
  CollapsibleCardFooter 
};