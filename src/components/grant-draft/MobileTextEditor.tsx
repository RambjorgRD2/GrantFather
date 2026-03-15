import { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Save,
  X,
  Maximize,
  Minimize,
  Wand2,
  RotateCcw,
  FileText,
  Mic,
  Eye,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionAIToolbar } from './SectionAIToolbar';

interface MobileTextEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  sectionKey: string;
  sectionLabel: string;
  isRegenerating: boolean;
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRegenerate: (tone?: string) => void;
  onImproveWriting: (improvement: string) => void;
  placeholder?: string;
}

export function MobileTextEditor({
  open,
  onOpenChange,
  value,
  onChange,
  sectionKey,
  sectionLabel,
  isRegenerating,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onRegenerate,
  onImproveWriting,
  placeholder = "Start writing..."
}: MobileTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = value.length;

  // Auto-save indicator
  useEffect(() => {
    if (value.length > 0) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [value]);

  // Focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSave = () => {
    setLastSaved(new Date());
    // Auto-save is handled by parent component
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const getSectionDescription = () => {
    const descriptions = {
      introduction: 'Introduce your project and organization to create a strong first impression.',
      need_statement: 'Clearly define the problem your project will address and why it matters.',
      project_plan: 'Detail your methodology, timeline, and approach to solving the problem.',
      budget: 'Outline your funding requirements and how the money will be allocated.',
      outcomes: 'Describe the expected impact and measurable results of your project.',
      conclusion: 'Summarize your proposal and reinforce why it deserves funding.'
    };
    return descriptions[sectionKey as keyof typeof descriptions] || '';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn(
        "transition-all duration-300",
        isFullscreen ? "h-screen" : "max-h-[90vh]"
      )}>
        {/* Header */}
        <DrawerHeader className="flex-shrink-0 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <DrawerTitle className="text-lg">{sectionLabel}</DrawerTitle>
                <DrawerDescription className="text-sm">
                  {getSectionDescription()}
                </DrawerDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePreview}
                className="h-8 w-8"
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
              {lastSaved && (
                <Badge variant="secondary" className="text-xs">
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
            
            {isRegenerating && (
              <Badge variant="secondary" className="text-xs">
                <Wand2 className="h-3 w-3 mr-1 animate-spin" />
                AI Writing...
              </Badge>
            )}
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {!showPreview ? (
            /* Editor View */
            <div className="flex-1 p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full resize-none border-none bg-transparent text-sm leading-relaxed focus:ring-0 focus:outline-none"
                style={{ minHeight: isFullscreen ? '70vh' : '60vh' }}
              />
            </div>
          ) : (
            /* Preview View */
            <ScrollArea className="flex-1 p-4">
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold mb-4">{sectionLabel}</h3>
                <div className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                  {value || "No content to preview yet. Start writing to see your content here."}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* AI Tools Footer - Fixed positioning */}
        <div className="flex-shrink-0 border-t border-border/50 p-4 bg-background/95 backdrop-blur-lg">
          <SectionAIToolbar
            sectionKey={sectionKey}
            isRegenerating={isRegenerating}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            onRegenerate={onRegenerate}
            onImproveWriting={onImproveWriting}
            isMobile={true}
            className="w-full"
          />
        </div>

      </DrawerContent>
    </Drawer>
  );
}