import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react';
import { SectionSettingsDrawer } from './SectionSettingsDrawer';

interface MobileSectionIndicatorProps {
  sections: Record<string, string>;
  sectionLabels: Record<string, string>;
  activeSection: string;
  onSectionChange?: (section: string) => void;
  className?: string;
}

interface SettingsSection {
  key: string;
  label: string;
}

const SECTION_ICONS = {
  introduction: FileText,
  need_statement: User,
  project_plan: Calendar,
  budget: DollarSign,
  outcomes: Target,
  conclusion: CheckCircle,
};

export function MobileSectionIndicator({
  sections,
  sectionLabels,
  activeSection,
  onSectionChange,
  className
}: MobileSectionIndicatorProps) {
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const getSectionStatus = (sectionKey: string) => {
    const content = sections[sectionKey] || '';
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount === 0) return { status: 'empty', progress: 0, color: 'bg-gray-400' };
    if (wordCount < 50) return { status: 'started', progress: 25, color: 'bg-yellow-500' };
    if (wordCount < 150) return { status: 'progress', progress: 70, color: 'bg-blue-500' };
    return { status: 'complete', progress: 100, color: 'bg-green-500' };
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'empty': return 'Not started';
      case 'started': return 'In progress';
      case 'progress': return 'Good progress';
      case 'complete': return 'Complete';
      default: return 'Unknown';
    }
  };

  const totalSections = Object.keys(sectionLabels).length;
  
  // Calculate weighted progress based on actual section completion
  const getOverallProgress = () => {
    let totalProgress = 0;
    let totalWeight = 0;
    
    Object.keys(sectionLabels).forEach(key => {
      const { progress } = getSectionStatus(key);
      const weight = 1; // Equal weight for all sections
      totalProgress += (progress * weight);
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(totalProgress / totalWeight) : 0;
  };

  const overallProgress = getOverallProgress();
  
  const completedSections = Object.keys(sections).filter(key => {
    const status = getSectionStatus(key);
    return status.status === 'complete';
  }).length;
  
  const totalWordCount = Object.values(sections).reduce((total, content) => {
    return total + (content?.trim().split(/\s+/).filter(word => word.length > 0).length || 0);
  }, 0);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Application Progress</h3>
            <Badge variant="secondary" className="text-xs">
              {completedSections}/{totalSections} sections
            </Badge>
          </div>
          
          <Progress value={overallProgress} className="h-2" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{overallProgress}% complete</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {totalWordCount} words
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Est. {Math.max(1, Math.ceil((totalSections - completedSections) * 2.5))} min left
              </span>
            </div>
          </div>
        </div>

        {/* Section Status Grid - Compact 150px Layout */}
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(sectionLabels).map(([key, label]) => {
            const Icon = SECTION_ICONS[key as keyof typeof SECTION_ICONS];
            const { status, progress, color } = getSectionStatus(key);
            const isActive = activeSection === key;
            
            return (
              <div key={key} className="relative">
                <button
                  onClick={() => onSectionChange?.(key)}
                  className={cn(
                    "p-2 rounded-md border transition-all duration-200 text-left w-full min-h-[40px] touch-manipulation group",
                    "hover:shadow-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isActive 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border/50 bg-background/50 hover:border-border hover:bg-background/70"
                  )}
                  aria-label={`Navigate to ${label} section`}
                  disabled={!onSectionChange}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="relative flex-shrink-0">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <div className={cn("absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full", color)} />
                    </div>
                    <span className="text-xs font-medium truncate flex-1">{label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsSection({ key, label });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-background/80 rounded flex-shrink-0"
                      aria-label="Section settings"
                    >
                      <Settings className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress value={progress} className="h-0.5" />
                    <span className="text-xs text-muted-foreground truncate">
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {Math.round((completedSections / totalSections) * 100)}% done
            </span>
            <span>Target: 2000+ words</span>
          </div>
          
          {overallProgress >= 80 && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              Ready to submit
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Section Settings Drawer */}
      {settingsSection && (
        <SectionSettingsDrawer
          open={!!settingsSection}
          onOpenChange={(open) => !open && setSettingsSection(null)}
          sectionKey={settingsSection.key}
          sectionLabel={settingsSection.label}
        />
      )}
    </Card>
  );
}