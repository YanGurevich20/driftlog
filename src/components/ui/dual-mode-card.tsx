'use client';

import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from '@/components/ui/separator';


type ActiveMode = 'auto' | 'manual' | null;

interface DualModeCardProps {
  children?: React.ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
}

interface DualModeCardHeaderProps {
  children?: React.ReactNode;
  className?: string;
  leftTrigger: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  };
  rightTrigger: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  };
}

interface DualModeCardContentProps {
  children?: React.ReactNode;
  className?: string;
}

const DualModeCardContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;
}>({
  isOpen: true,
  setIsOpen: () => {},
  activeMode: null,
  setActiveMode: () => {},
});

function DualModeCard({ 
  children, 
  className,
  defaultCollapsed = false,
  ...props 
}: DualModeCardProps) {
  const [isOpen, setIsOpen] = React.useState(!defaultCollapsed);
  const [activeMode, setActiveMode] = React.useState<ActiveMode>(null);
  
  React.useEffect(() => {
    setIsOpen(!defaultCollapsed);
  }, [defaultCollapsed]);

  return (
    <DualModeCardContext.Provider value={{ isOpen, setIsOpen, activeMode, setActiveMode }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={className} {...props}>
          {children}
        </Card>
      </Collapsible>
    </DualModeCardContext.Provider>
  );
}

function DualModeCardHeader({ 
  className,
  leftTrigger,
  rightTrigger,
  ...props 
}: DualModeCardHeaderProps) {
  const { isOpen, activeMode, setActiveMode, setIsOpen } = React.useContext(DualModeCardContext);

  const handleTriggerClick = (mode: 'auto' | 'manual', triggerCallback: () => void) => {
    if (activeMode === mode) {
      // Clicking the same trigger collapses - delay activeMode reset
      setIsOpen(false);
      // Reset activeMode after animation completes
      setTimeout(() => setActiveMode(null), 200);
    } else {
      // Clicking a different trigger switches mode
      setActiveMode(mode);
      setIsOpen(true);
      triggerCallback();
    }
  };

  return (
    <CardHeader 
      className={cn(
        className,
        !isOpen && "border-b-0 dark:border-b-0"
      )} 
      {...props}
    >
      <div className="flex items-stretch w-full relative">
        {/* Left Trigger */}
        <Button
          className={cn("rounded-full",
            activeMode === 'auto' && isOpen 
              ? "flex-1" 
              : activeMode === 'manual' && isOpen
              ? "opacity-0 flex-[0_0_0px] overflow-hidden px-0"
              : "flex-1"
          )}
          variant={isOpen ? "outline" : "default"}
          onClick={() => handleTriggerClick('auto', leftTrigger.onClick)}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            {leftTrigger.icon}
            <span className="text-sm font-medium">{leftTrigger.label}</span>
          </div>
        </Button>

        {/* Separator */}
        <Separator 
          orientation="vertical" 
          className={cn(
            "transition-all duration-200",
            activeMode && isOpen ? "p-0" : "p-2"
          )} 
        />

        {/* Right Trigger */}
        <Button
          className={cn("rounded-full",
            activeMode === 'manual' && isOpen 
              ? "flex-1" 
              : activeMode === 'auto' && isOpen
              ? "opacity-0 flex-[0_0_0px] overflow-hidden px-0"
              : "flex-1"
          )}
          variant={isOpen ? "outline" : "default"}
          onClick={() => handleTriggerClick('manual', rightTrigger.onClick)}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            {rightTrigger.icon}
            <span className="text-sm font-medium">{rightTrigger.label}</span>
          </div>
        </Button>
      </div>
    </CardHeader>
  );
}

function DualModeCardContent({ 
  children, 
  className,
  ...props 
}: DualModeCardContentProps) {
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

export { 
  DualModeCard, 
  DualModeCardHeader, 
  DualModeCardContent,
  DualModeCardContext
};