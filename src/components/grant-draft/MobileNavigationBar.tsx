import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  Target,
  CheckCircle,
  Home,
  Plus,
  Settings
} from 'lucide-react';

interface MobileNavigationBarProps {
  activeSection: string;
  sections: Record<string, string>;
  onSectionChange: (section: string) => void;
  onGenerateNew?: () => void;
  onOpenTools?: () => void;
  onOpenPreview?: () => void;
}

const SECTION_ICONS = {
  introduction: FileText,
  need_statement: User,
  project_plan: Calendar,
  budget: DollarSign,
  outcomes: Target,
  conclusion: CheckCircle,
};

const SECTION_LABELS = {
  introduction: 'Intro',
  need_statement: 'Need',
  project_plan: 'Plan',
  budget: 'Budget',
  outcomes: 'Impact',
  conclusion: 'Sum',
};

export function MobileNavigationBar({
  activeSection,
  sections,
  onSectionChange,
  onGenerateNew,
  onOpenTools,
  onOpenPreview
}: MobileNavigationBarProps) {
  const getCompletionStatus = (sectionKey: string) => {
    const content = sections[sectionKey] || '';
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount === 0) return 'empty';
    if (wordCount < 50) return 'started';
    if (wordCount < 150) return 'progress';
    return 'complete';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'empty': return 'bg-gray-400';
      case 'started': return 'bg-yellow-500';
      case 'progress': return 'bg-blue-500';
      case 'complete': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50">

      {/* Navigation Sections - Compact 150px Layout */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const Icon = SECTION_ICONS[key as keyof typeof SECTION_ICONS];
            const status = getCompletionStatus(key);
            const isActive = activeSection === key;
            
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onSectionChange(key)}
                className={cn(
                  "flex-col h-auto py-1.5 px-2 min-w-[56px] relative",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-3.5 w-3.5 mb-0.5" />
                  <div 
                    className={cn(
                      "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                      getStatusColor(status)
                    )}
                  />
                </div>
                <span className="text-xs leading-tight">{label}</span>
              </Button>
            );
          })}
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex items-center gap-1.5 ml-2">
          {onOpenTools && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenTools}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onGenerateNew && (
            <Button
              size="sm"
              onClick={onGenerateNew}
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}