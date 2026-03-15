import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  type: 'ui' | 'ai';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LanguageSelector({ type, variant = 'outline', size = 'sm' }: LanguageSelectorProps) {
  const { uiLanguage, aiLanguage, setUILanguage, setAILanguage } = useLanguage();
  
  const currentLanguage = type === 'ui' ? uiLanguage : aiLanguage;
  const setLanguage = type === 'ui' ? setUILanguage : setAILanguage;
  
  const currentLangInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage);

  return (
    <DropdownMenu data-testid={`language-selector-${type}`}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className="gap-2 bg-card dark:bg-card"
          data-testid={`language-selector-${type}-button`}
        >
          <Globe className="h-4 w-4" data-testid={`language-selector-${type}-icon`} />
          <span className="hidden sm:inline" data-testid={`language-selector-${type}-flag`}>
            {currentLangInfo?.flag}
          </span>
          <span className="hidden md:inline" data-testid={`language-selector-${type}-name`}>
            {currentLangInfo?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-card dark:bg-card border-border z-50"
        data-testid={`language-selector-${type}-menu`}
      >
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          {type === 'ui' ? 'Interface Language' : 'AI Response Language'}
        </div>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`cursor-pointer ${
              currentLanguage === language.code 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-accent/50'
            }`}
            data-testid={`language-option-${language.code}`}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}