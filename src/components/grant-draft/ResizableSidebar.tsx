import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ResizableSidebar({
  isOpen,
  onToggle,
  children,
  className
}: ResizableSidebarProps) {
  const fixedWidth = 150;

  return (
    <div className={cn("relative flex-shrink-0 bg-background border-r border-border", className)}>
      <div
        style={{ width: isOpen ? fixedWidth : 0 }}
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="h-full p-2">
          {children}
        </div>
      </div>
      
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-4 z-10 h-8 w-8 border border-border bg-background shadow-sm hover:bg-accent",
          isOpen ? "-right-4" : "-right-4"
        )}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}