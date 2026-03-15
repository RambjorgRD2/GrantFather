import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  FileText,
  Wand2,
  Info,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { AIProviderSelector } from './AIProviderSelector';
import { sectionConfigService } from '@/services/sectionConfigService';
import { useState, useEffect } from 'react';

interface SectionAIToolbarProps {
  sectionKey: string;
  isRegenerating: boolean;
  selectedProvider?: string;
  selectedModel?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
  onRegenerate: (tone?: string) => void;
  onImproveWriting: (improvement: string) => void;
  className?: string;
  isMobile?: boolean;
}

export function SectionAIToolbar({
  sectionKey,
  isRegenerating,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onRegenerate,
  onImproveWriting,
  className,
  isMobile = false,
}: SectionAIToolbarProps) {
  const [sectionSettings, setSectionSettings] = useState(() =>
    sectionConfigService.getSectionSettings(sectionKey)
  );
  const [showTips, setShowTips] = useState(false);

  // Update settings when section changes
  useEffect(() => {
    setSectionSettings(sectionConfigService.getSectionSettings(sectionKey));
  }, [sectionKey]);

  // Get section-specific options
  const toneOptions = sectionSettings.toneOptions.map((tone) => ({
    value: tone,
    label: tone.charAt(0).toUpperCase() + tone.slice(1),
  }));

  const improvementOptions = sectionSettings.improvementOptions.map(
    (improvement) => ({
      value: improvement,
      label:
        improvement === 'compelling'
          ? 'Make more compelling'
          : improvement === 'clarity'
          ? 'Improve clarity'
          : improvement === 'evidence'
          ? 'Add more evidence'
          : improvement === 'concise'
          ? 'Make more concise'
          : improvement,
      icon: <Sparkles className="h-4 w-4 mr-2" />,
    })
  );
  if (isMobile) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                disabled={isRegenerating}
                className="glass-subtle hover:glass border-white/20 flex-1 min-h-[44px]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-50 bg-background/95 border backdrop-blur-xl w-48 shadow-lg"
            >
              <DropdownMenuItem onClick={() => onRegenerate()}>
                <FileText className="h-4 w-4 mr-2" />
                Standard
              </DropdownMenuItem>
              {toneOptions.map((tone) => (
                <DropdownMenuItem
                  key={tone.value}
                  onClick={() => onRegenerate(tone.value)}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {tone.label} Tone
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                disabled={isRegenerating}
                className="glass-subtle hover:glass border-white/20 flex-1 min-h-[44px]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Improve
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-50 bg-background/95 border backdrop-blur-xl w-48 shadow-lg"
            >
              {improvementOptions.map((improvement) => (
                <DropdownMenuItem
                  key={improvement.value}
                  onClick={() => onImproveWriting(improvement.value)}
                >
                  {improvement.icon}
                  {improvement.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AIProviderSelector
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          size="default"
          className="glass-subtle w-full"
          isMobile={true}
        />

        {/* Tips Section */}
        <div className="mt-3 p-3 bg-blue-50/10 rounded-lg border border-blue-200/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-100">Writing Tips</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTips(!showTips)}
              className="h-6 w-6 p-0 text-blue-200 hover:text-blue-100"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          {showTips && (
            <div className="space-y-2">
              {sectionSettings.tips.slice(0, 3).map((tip, index) => (
                <p
                  key={index}
                  className="text-xs text-blue-200/80 leading-relaxed"
                >
                  • {tip}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isRegenerating}
            className="glass-subtle hover:glass border-white/20"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-50 bg-background/95 border backdrop-blur-xl shadow-lg"
        >
          <DropdownMenuItem onClick={() => onRegenerate()}>
            <FileText className="h-4 w-4 mr-2" />
            Standard
          </DropdownMenuItem>
          {toneOptions.map((tone) => (
            <DropdownMenuItem
              key={tone.value}
              onClick={() => onRegenerate(tone.value)}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {tone.label} Tone
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isRegenerating}
            className="glass-subtle hover:glass border-white/20"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Improve
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-50 bg-background/95 border backdrop-blur-xl shadow-lg"
        >
          {improvementOptions.map((improvement) => (
            <DropdownMenuItem
              key={improvement.value}
              onClick={() => onImproveWriting(improvement.value)}
            >
              {improvement.icon}
              {improvement.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AIProviderSelector
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={onProviderChange}
        onModelChange={onModelChange}
        size="sm"
        className="glass-subtle"
      />
    </div>
  );
}
