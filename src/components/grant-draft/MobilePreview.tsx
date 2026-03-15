import { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  Download,
  Share,
  FileText,
  X,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Record<string, string>;
  sectionLabels: Record<string, string>;
  projectName: string;
  organizationName: string;
  onDownloadPDF?: () => void;
  onShare?: () => void;
}

export function MobilePreview({
  open,
  onOpenChange,
  sections,
  sectionLabels,
  projectName,
  organizationName,
  onDownloadPDF,
  onShare
}: MobilePreviewProps) {
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState('sm');
  const [copied, setCopied] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    const saved = localStorage.getItem('mobile-preview-sidebar-visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const fixedSidebarWidth = 200;

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('mobile-preview-sidebar-visible', JSON.stringify(sidebarVisible));
  }, [sidebarVisible]);

  const completedSections = Object.entries(sections).filter(([_, content]) => 
    content && content.trim().length > 0
  );

  const totalWordCount = completedSections.reduce((total, [_, content]) => {
    return total + content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, 0);

  const handleCopyAll = async () => {
    const fullText = completedSections
      .map(([key, content]) => `${sectionLabels[key]}\n\n${content}`)
      .join('\n\n---\n\n');
    
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const navigateToSection = (sectionKey: string) => {
    setCurrentSection(sectionKey);
    const element = document.getElementById(`preview-${sectionKey}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustFontSize = (direction: 'up' | 'down') => {
    const sizes = ['2xs-extra', '2xs', 'xs', 'sm', 'base', 'lg'];
    const currentIndex = sizes.indexOf(fontSize);
    
    if (direction === 'up' && currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
    } else if (direction === 'down' && currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
    }
  };

  const getFontSizeClasses = () => {
    switch (fontSize) {
      case '2xs-extra': return 'text-[11px] leading-relaxed';
      case '2xs': return 'text-xs leading-relaxed';
      case 'xs': return 'text-xs leading-relaxed';
      case 'sm': return 'text-sm leading-relaxed';
      case 'lg': return 'text-lg leading-relaxed';
      default: return 'text-base leading-relaxed';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {/* Header */}
        <DrawerHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Grant Application Preview
              </DrawerTitle>
              <DrawerDescription>
                {projectName} • {organizationName}
              </DrawerDescription>
            </div>
            
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>

          {/* Stats & Controls */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {completedSections.length}/{Object.keys(sectionLabels).length} sections
              </Badge>
              <Badge variant="outline">
                {totalWordCount} words
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="h-8 w-8"
              >
                {sidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => adjustFontSize('down')}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => adjustFontSize('up')}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyAll}
                className="h-8 w-8"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Section Navigation */}
          {sidebarVisible && (
            <div 
              style={{ width: fixedSidebarWidth }}
              className="border-r border-border/50 p-4 transition-all duration-200"
            >
              <div className="space-y-2">
                <Button
                  variant={currentSection === null ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentSection(null)}
                  className="w-full justify-start text-xs"
                >
                  Overview
                </Button>
                
                <Separator />
                
                {Object.entries(sectionLabels).map(([key, label]) => {
                  const content = sections[key];
                  const hasContent = content && content.trim().length > 0;
                  
                  return (
                    <Button
                      key={key}
                      variant={currentSection === key ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => navigateToSection(key)}
                      disabled={!hasContent}
                      className={cn(
                        "w-full justify-start text-xs",
                        !hasContent && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          hasContent ? "bg-green-500" : "bg-gray-400"
                        )} />
                        <span className="truncate">{label}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-none space-y-8">
              {/* Document Header */}
              <div className="text-center pb-6 border-b border-border/20">
                <h1 className="text-2xl font-bold mb-2">{projectName}</h1>
                <p className="text-muted-foreground">{organizationName}</p>
              </div>

              {/* Sections */}
              {completedSections.map(([key, content]) => (
                <div key={key} id={`preview-${key}`} className="space-y-4">
                  <h2 className="text-xl font-semibold text-primary border-b border-border/20 pb-2">
                    {sectionLabels[key]}
                  </h2>
                  <div className={cn(
                    "whitespace-pre-wrap text-foreground",
                    getFontSizeClasses()
                  )}>
                    {content}
                  </div>
                </div>
              ))}
              
              {completedSections.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No content to preview</h3>
                  <p className="text-sm">
                    Start writing your grant application sections to see them here.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Action Bar */}
        <div className="border-t border-border/50 p-4">
          <div className="flex items-center gap-2">
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            
            {onDownloadPDF && (
              <Button variant="outline" size="sm" onClick={onDownloadPDF} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Close Preview
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}