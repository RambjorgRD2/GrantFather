import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { SectionAIToolbar } from "./SectionAIToolbar";
import { cn } from "@/lib/utils";

interface GrantSection {
  introduction: string;
  need_statement: string;
  project_plan: string;
  budget: string;
  outcomes: string;
  conclusion: string;
}

interface MobileSectionCollapseProps {
  sections: GrantSection;
  sectionLabels: Record<string, string>;
  activeSection: string;
  isRegenerating: boolean;
  selectedProvider: string;
  selectedModel: string;
  onSectionChange: (section: keyof GrantSection, value: string) => void;
  onSectionSelect: (section: string) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRegenerate: (tone?: string) => void;
  onImproveWriting: (improvement: string) => void;
}

export function MobileSectionCollapse({
  sections,
  sectionLabels,
  activeSection,
  isRegenerating,
  selectedProvider,
  selectedModel,
  onSectionChange,
  onSectionSelect,
  onProviderChange,
  onModelChange,
  onRegenerate,
  onImproveWriting
}: MobileSectionCollapseProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([activeSection]));

  const toggleSection = (sectionKey: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionKey)) {
      newOpenSections.delete(sectionKey);
    } else {
      // On mobile, only allow one section open at a time for better UX
      newOpenSections.clear();
      newOpenSections.add(sectionKey);
    }
    setOpenSections(newOpenSections);
    onSectionSelect(sectionKey);
  };

  const getSectionDescription = (key: string) => {
    const descriptions = {
      introduction: 'Introduce your project and organization',
      need_statement: 'Define the problem you\'re addressing',
      project_plan: 'Detail your project methodology and timeline',
      budget: 'Outline funding requirements and allocation',
      outcomes: 'Describe expected impact and measurable results',
      conclusion: 'Summarize and reinforce your request'
    };
    return descriptions[key as keyof typeof descriptions] || '';
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCompletionStatus = (text: string) => {
    const wordCount = getWordCount(text);
    if (wordCount === 0) return { status: 'empty', color: 'bg-gray-500' };
    if (wordCount < 50) return { status: 'started', color: 'bg-yellow-500' };
    if (wordCount < 150) return { status: 'progress', color: 'bg-blue-500' };
    return { status: 'complete', color: 'bg-green-500' };
  };

  return (
    <div className="space-y-3">
      {Object.entries(sectionLabels).map(([key, label]) => {
        const isOpen = openSections.has(key);
        const wordCount = getWordCount(sections[key as keyof GrantSection]);
        const completion = getCompletionStatus(sections[key as keyof GrantSection]);
        
        return (
          <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
            <Card className="swiss-card overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full h-auto p-0 hover:bg-transparent"
                >
                  <CardHeader className="w-full py-4 px-6">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", completion.color)} />
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-base font-medium">{label}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {wordCount} words
                            </span>
                            {isRegenerating && activeSection === key && (
                              <Badge variant="secondary" className="text-xs">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Generating...
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )} 
                      />
                    </div>
                  </CardHeader>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <CardContent className="px-6 pb-6 pt-0 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {getSectionDescription(key)}
                  </p>
                  
                  <SectionAIToolbar
                    sectionKey={key}
                    isRegenerating={isRegenerating && activeSection === key}
                    onRegenerate={onRegenerate}
                    onImproveWriting={onImproveWriting}
                    className="w-full"
                    isMobile={true}
                  />
                  
                  <Textarea
                    value={sections[key as keyof GrantSection]}
                    onChange={(e) => onSectionChange(key as keyof GrantSection, e.target.value)}
                    placeholder={`Write your ${label.toLowerCase()} here...`}
                    className="mobile-textarea min-h-[280px] text-base leading-relaxed resize-none"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}