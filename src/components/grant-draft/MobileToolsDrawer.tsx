import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionAIToolbar } from './SectionAIToolbar';
import { AIProviderSelector } from './AIProviderSelector';
import { GrantPortalIntegration } from './GrantPortalIntegration';
import { DataSourceDocs } from './DataSourceDocs';
import { Settings, Wand2, FileText, Info, ChevronRight, X } from 'lucide-react';

interface MobileToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: string;
  isRegenerating: boolean;
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRegenerate: (tone?: string) => void;
  onImproveWriting: (improvement: string) => void;
}

type ToolSection = 'ai' | 'portal' | 'docs';

export function MobileToolsDrawer({
  open,
  onOpenChange,
  activeSection,
  isRegenerating,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onRegenerate,
  onImproveWriting,
}: MobileToolsDrawerProps) {
  const { user } = useAuth();
  const [activeToolSection, setActiveToolSection] =
    useState<ToolSection>('portal');

  // Check if user has superadmin role
  const { isSuperAdmin } = useSuperAdmin();

  const renderToolContent = () => {
    switch (activeToolSection) {
      case 'ai':
        return isSuperAdmin ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">AI Writing Tools</h3>
              <SectionAIToolbar
                sectionKey={activeSection}
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

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">AI Provider Settings</h3>
              <AIProviderSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={onProviderChange}
                onModelChange={onModelChange}
                isMobile={true}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">AI Tools</h3>
            <p className="text-sm text-muted-foreground">
              AI tools are only available to SuperAdmin users.
            </p>
          </div>
        );

      case 'portal':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Grant Portal Integration</h3>
            <GrantPortalIntegration />
          </div>
        );

      case 'docs':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Data Source Documentation</h3>
            <DataSourceDocs />
          </div>
        );

      default:
        return null;
    }
  };

  const toolSections = [
    ...(isSuperAdmin
      ? [
          {
            id: 'ai' as const,
            label: 'AI Tools',
            icon: Wand2,
            description: 'Regenerate and improve content',
          },
        ]
      : []),
    {
      id: 'portal' as const,
      label: 'Portal Integration',
      icon: Info,
      description: 'Connect to grant portals',
    },
    {
      id: 'docs' as const,
      label: 'Documentation',
      icon: FileText,
      description: 'Reference materials',
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI & Data Tools
          </DrawerTitle>
          <DrawerDescription>
            Access AI writing tools, settings, and data sources
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex h-full">
          {/* Tool Navigation */}
          <div className="w-1/3 border-r border-border/50 p-4">
            <div className="space-y-2">
              {toolSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeToolSection === section.id;

                return (
                  <Button
                    key={section.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setActiveToolSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {section.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {section.description}
                        </span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Tool Content */}
          <div className="flex-1 p-4">
            <ScrollArea className="h-full">{renderToolContent()}</ScrollArea>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-border/50">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            variant="outline"
          >
            Close Tools
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
