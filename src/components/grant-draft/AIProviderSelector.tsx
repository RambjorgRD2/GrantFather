import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Cpu } from "lucide-react";
import { AI_PROVIDERS, trackModelUsage } from "@/services/aiProviders";
import { cn } from "@/lib/utils";

interface AIProviderSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (model: string) => void;
  className?: string;
  size?: "sm" | "default";
  isMobile?: boolean;
}

export function AIProviderSelector({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  className,
  size = "default",
  isMobile = false
}: AIProviderSelectorProps) {
  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);
  const currentModel = currentProvider?.models.find(m => m === selectedModel);

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider?.comingSoon) return;
    onProviderChange(providerId);
    if (provider?.models.length) {
      onModelChange(provider.models[0]);
      trackModelUsage(providerId, provider.models[0]);
    }
  };

  const handleModelChange = (model: string) => {
    onModelChange(model);
    // Track model selection
    trackModelUsage(selectedProvider, model);
  };

  if (isMobile) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="default"
              className="glass-subtle hover:glass border-white/20 w-full min-h-[44px] justify-between"
            >
              <div className="flex items-center">
                {currentProvider?.icon}
                <span className="ml-2">{currentProvider?.name}</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/20 backdrop-blur-xl w-48">
            {AI_PROVIDERS.map((provider) => (
              <DropdownMenuItem
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                disabled={provider.comingSoon}
                className={provider.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {provider.icon}
                <span className="ml-2">{provider.name}</span>
                {provider.comingSoon && (
                  <Badge variant="secondary" className="ml-auto text-xs">Soon</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="default"
              className="glass-subtle hover:glass border-white/20 w-full min-h-[44px] justify-between"
            >
              <div className="flex items-center">
                <Cpu className="h-4 w-4 mr-2" />
                {currentModel}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/20 backdrop-blur-xl w-64">
            {currentProvider?.models.map((model) => (
              <DropdownMenuItem 
                key={model}
               onClick={() => handleModelChange(model)}
              >
                <Cpu className="h-4 w-4 mr-2" />
                <span>{model}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={size}
            className="glass-subtle hover:glass border-white/20"
          >
            {currentProvider?.icon}
            <span className="ml-1 mr-1">{currentProvider?.name}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass border-white/20 backdrop-blur-xl">
          {AI_PROVIDERS.map((provider) => (
            <DropdownMenuItem
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              disabled={provider.comingSoon}
              className={provider.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {provider.icon}
              <span className="ml-2">{provider.name}</span>
              {provider.comingSoon && (
                <Badge variant="secondary" className="ml-auto text-xs">Soon</Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={size}
            className="glass-subtle hover:glass border-white/20"
          >
            <Cpu className="h-3 w-3 mr-1" />
            {currentModel}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass border-white/20 backdrop-blur-xl">
          {currentProvider?.models.map((model) => (
            <DropdownMenuItem 
              key={model}
              onClick={() => handleModelChange(model)}
            >
              <Cpu className="h-4 w-4 mr-2" />
              <span>{model}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}