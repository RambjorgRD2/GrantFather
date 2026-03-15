import React, { createContext, useContext, useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

interface LanguageContextType {
  uiLanguage: LanguageCode;
  aiLanguage: LanguageCode;
  setUILanguage: (lang: LanguageCode) => void;
  setAILanguage: (lang: LanguageCode) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date | null | undefined) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [uiLanguage, setUILanguageState] = useState<LanguageCode>('en');
  const [aiLanguage, setAILanguageState] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load language preferences from organization
  useEffect(() => {
    if (organization) {
      setUILanguageState((organization.ui_language as LanguageCode) || 'en');
      setAILanguageState((organization.ai_response_language as LanguageCode) || 'en');
      setIsLoading(false);
    }
  }, [organization]);

  const setUILanguage = async (lang: LanguageCode) => {
    if (!organization?.id) return;

    const startTime = performance.now();
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ ui_language: lang })
        .eq('id', organization.id)
        .eq('created_by', user?.id!);

      if (error) throw error;
      
      setUILanguageState(lang);
      
      // Track performance
      const duration = performance.now() - startTime;
      console.log(`UI language switch to ${lang} took ${duration}ms`);
      
    } catch (error) {
      console.error('Error updating UI language:', error);
      // Track failed language switch
      const duration = performance.now() - startTime;
      console.log(`Failed UI language switch to ${lang} took ${duration}ms`);
    }
  };

  const setAILanguage = async (lang: LanguageCode) => {
    if (!organization?.id) return;

    const startTime = performance.now();
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ ai_response_language: lang })
        .eq('id', organization.id)
        .eq('created_by', user?.id!);

      if (error) throw error;
      
      setAILanguageState(lang);
      
      // Track performance
      const duration = performance.now() - startTime;
      console.log(`AI language switch to ${lang} took ${duration}ms`);
      
    } catch (error) {
      console.error('Error updating AI language:', error);
      // Track failed language switch  
      const duration = performance.now() - startTime;
      console.log(`Failed AI language switch to ${lang} took ${duration}ms`);
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencyMap: Record<LanguageCode, { currency: string; locale: string }> = {
      en: { currency: 'USD', locale: 'en-US' },
      no: { currency: 'NOK', locale: 'no-NO' },
      sv: { currency: 'SEK', locale: 'sv-SE' },
      da: { currency: 'DKK', locale: 'da-DK' },
      de: { currency: 'EUR', locale: 'de-DE' },
      fr: { currency: 'EUR', locale: 'fr-FR' },
      es: { currency: 'EUR', locale: 'es-ES' },
      it: { currency: 'EUR', locale: 'it-IT' },
    };

    const { currency, locale } = currencyMap[uiLanguage];
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    // Handle null/undefined values
    if (!date) return 'N/A';
    
    const localeMap: Record<LanguageCode, string> = {
      en: 'en-US',
      no: 'no-NO',
      sv: 'sv-SE', 
      da: 'da-DK',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      it: 'it-IT',
    };

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the resulting date is valid
    if (dateObj instanceof Date && isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString(localeMap[uiLanguage]);
  };

  return (
    <LanguageContext.Provider
      value={{
        uiLanguage,
        aiLanguage,
        setUILanguage,
        setAILanguage,
        formatCurrency,
        formatDate,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}