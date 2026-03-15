import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionSettingsButton } from './SectionSettingsButton';
import { SectionSettingsDialog } from './SectionSettingsDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface SectionNavigationProps {
  sections: Record<string, string>;
  sectionLabels: Record<string, string>;
  activeSection: string;
  onSectionSelect: (section: string) => void;
  completionStatus?: Record<string, string>;
  className?: string;
}

export function SectionNavigation({
  sections,
  sectionLabels,
  activeSection,
  onSectionSelect,
  completionStatus = {},
  className
}: SectionNavigationProps) {
  const isMobile = useIsMobile();
  const [settingsSection, setSettingsSection] = useState<{key: string, label: string} | null>(null);
  const calculateCompletionStats = () => {
    const totalSections = Object.keys(sectionLabels).length;
    const completedSections = Object.entries(sections).filter(([_, content]) => 
      content && content.trim().length > 0
    ).length;
    
    return { total: totalSections, completed: completedSections };
  };

  const { total, completed } = calculateCompletionStats();
  const completionPercentage = Math.round((completed / total) * 100);

  const getSectionStatus = (sectionKey: string) => {
    const content = sections[sectionKey];
    return content && content.trim().length > 0;
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sections</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {completed}/{total} completed
            </Badge>
          </div>
        </div>
      </div>
      
      <Separator className="mb-4" />
      
      {/* Section List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {Object.entries(sectionLabels).map(([sectionKey, label]) => {
            const isActive = activeSection === sectionKey;
            const isCompleted = getSectionStatus(sectionKey);
            
            return (
              <Button
                key={sectionKey}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onSectionSelect(sectionKey)}
                className={cn(
                  "w-full justify-start h-auto p-2 text-left group",
                  isActive && "bg-accent border border-accent-foreground/20"
                )}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight">{label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isCompleted ? 'Complete' : 'Not started'}
                    </div>
                  </div>
                  
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Total words:</span>
            <span className="font-medium">
              {Object.values(sections).reduce((total, content) => {
                return total + (content ? content.trim().split(/\s+/).filter(word => word.length > 0).length : 0);
              }, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Section Settings Dialog */}
      {settingsSection && !isMobile && (
        <SectionSettingsDialog
          open={!!settingsSection}
          onOpenChange={(open) => !open && setSettingsSection(null)}
          sectionKey={settingsSection.key}
          sectionLabel={settingsSection.label}
        />
      )}
    </div>
  );
}