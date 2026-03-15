import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { SectionSettingsButton } from './SectionSettingsButton';
import { SectionSettingsDrawer } from './SectionSettingsDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeableSectionProps {
  sectionKey: string;
  sectionLabel: string;
  content: string;
  isActive: boolean;
  isRegenerating: boolean;
  onContentChange: (value: string) => void;
  onEdit: () => void;
  onPreview: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableSection({
  sectionKey,
  sectionLabel,
  content,
  isActive,
  isRegenerating,
  onContentChange,
  onEdit,
  onPreview,
  onSwipeLeft,
  onSwipeRight,
  className
}: SwipeableSectionProps) {
  const isMobile = useIsMobile();
  const [showSettings, setShowSettings] = useState(false);
  const [isReadMode, setIsReadMode] = useState(true); // Default to read mode
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const MAX_DRAG = 150;

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setCurrentX(e.touches[0].clientX);
    
    const deltaX = e.touches[0].clientX - startX;
    const clampedDelta = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, deltaX));
    setDragOffset(clampedDelta);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaX = currentX - startX;
    
    // Determine swipe direction and trigger action
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset state
    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  // Mouse event handlers for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setCurrentX(e.clientX);
    
    const deltaX = e.clientX - startX;
    const clampedDelta = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, deltaX));
    setDragOffset(clampedDelta);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const deltaX = currentX - startX;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
    setStartX(0);
    setCurrentX(0);
  };

  const getWordCount = () => {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCompletionStatus = () => {
    const wordCount = getWordCount();
    if (wordCount === 0) return { status: 'empty', color: 'bg-gray-400' };
    if (wordCount < 50) return { status: 'started', color: 'bg-yellow-500' };
    if (wordCount < 150) return { status: 'progress', color: 'bg-blue-500' };
    return { status: 'complete', color: 'bg-green-500' };
  };

  const getSectionDescription = () => {
    const descriptions = {
      introduction: 'Introduce your project and organization',
      need_statement: 'Define the problem you\'re addressing',
      project_plan: 'Detail your project methodology and timeline',
      budget: 'Outline funding requirements and allocation',
      outcomes: 'Describe expected impact and measurable results',
      conclusion: 'Summarize and reinforce your request'
    };
    return descriptions[sectionKey as keyof typeof descriptions] || '';
  };

  const { color } = getCompletionStatus();
  const wordCount = getWordCount();

  return (
    <div className={cn("relative", className)}>
      {/* Swipe indicators */}
      {isDragging && (
        <>
          {dragOffset > 50 && onSwipeRight && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 text-green-600 bg-green-100 rounded-full px-3 py-1">
              <ChevronRight className="h-4 w-4" />
              <span className="text-sm font-medium">Next</span>
            </div>
          )}
          
          {dragOffset < -50 && onSwipeLeft && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 text-blue-600 bg-blue-100 rounded-full px-3 py-1">
              <span className="text-sm font-medium">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </div>
          )}
        </>
      )}

      <Card
        ref={cardRef}
        className={cn(
          "transition-transform duration-200 touch-pan-x",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          isActive && "ring-2 ring-primary/20"
        )}
        style={{
          transform: `translateX(${dragOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <FileText className="h-4 w-4 text-primary" />
              </div>
              
              <div>
                <CardTitle className="text-lg">{sectionLabel}</CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {wordCount} words
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {content.length} chars
                  </span>
                  {isRegenerating && (
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      AI Writing...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SectionSettingsButton
                onClick={() => setShowSettings(true)}
                className="h-8 w-8"
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsReadMode(!isReadMode)}
                className={cn(
                  "h-8 w-8",
                  isReadMode ? "bg-primary/10 text-primary" : ""
                )}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsReadMode(false);
                  onEdit();
                }}
                className={cn(
                  "h-8 w-8",
                  !isReadMode ? "bg-primary/10 text-primary" : ""
                )}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {getSectionDescription()}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {isReadMode ? (
            <div 
              className="min-h-[200px] text-sm leading-relaxed p-3 rounded-md bg-muted/30 cursor-pointer"
              onClick={() => setIsReadMode(false)}
            >
              {content || (
                <span className="text-muted-foreground italic">
                  Click to start writing your {sectionLabel.toLowerCase()}...
                </span>
              )}
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={`Write your ${sectionLabel.toLowerCase()} here...`}
              className="min-h-[200px] text-sm leading-relaxed resize-none border-none bg-transparent focus:ring-0 focus:outline-none"
              rows={8}
            />
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              {onSwipeLeft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSwipeLeft}
                  className="text-xs"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Previous
                </Button>
              )}
            </div>
            
            <Button
              onClick={() => {
                setIsReadMode(false);
                onEdit();
              }}
              size="sm"
              className="text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              {isReadMode ? 'Edit' : 'Preview'}
            </Button>
            
            <div className="flex items-center gap-2">
              {onSwipeRight && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSwipeRight}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Section Settings Drawer */}
      <SectionSettingsDrawer
        open={showSettings}
        onOpenChange={setShowSettings}
        sectionKey={sectionKey}
        sectionLabel={sectionLabel}
      />
    </div>
  );
}