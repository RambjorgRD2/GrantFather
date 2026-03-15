import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from './LanguageContext';

// Test component to access context
const TestComponent = () => {
  const { 
    uiLanguage, 
    aiLanguage, 
    setUILanguage, 
    setAILanguage, 
    formatCurrency, 
    formatDate,
    isLoading 
  } = useLanguage();
  
  return (
    <div>
      <span data-testid="ui-language">{uiLanguage}</span>
      <span data-testid="ai-language">{aiLanguage}</span>
      <span data-testid="loading">{isLoading.toString()}</span>
      <button data-testid="set-ui-en" onClick={() => setUILanguage('en')}>Set UI English</button>
      <button data-testid="set-ui-no" onClick={() => setUILanguage('no')}>Set UI Norwegian</button>
      <button data-testid="set-ai-en" onClick={() => setAILanguage('en')}>Set AI English</button>
      <button data-testid="set-ai-no" onClick={() => setAILanguage('no')}>Set AI Norwegian</button>
      <span data-testid="currency-en">{formatCurrency(1000)}</span>
      <span data-testid="date-en">{formatDate(new Date('2024-01-15'))}</span>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Setup', () => {
    it('should provide default language values', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('ui-language')).toHaveTextContent('en');
      expect(screen.getByTestId('ai-language')).toHaveTextContent('en');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('should load language preferences from organization', async () => {
      // Mock organization with different languages
      const mockUseOrganization = await import('@/hooks/useOrganization');
      vi.mocked(mockUseOrganization.useOrganization).mockReturnValue({
        organization: {
          id: 'test-org-id',
          ui_language: 'no',
          ai_response_language: 'sv',
          created_by: 'test-user-id',
          name: 'Test Organization',
          org_type: 'nonprofit',
          contact_email: 'test@example.com',
          contact_name: 'Test User',
          contact_phone: '123-456-7890',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          members_count: 1,
          description: 'Test organization description',
          website: 'https://test.org',
          mission: 'Test mission',
          logo_url: null,
          preferred_languages: ['no', 'sv'],
          funding_needs: [],
          event_types: [],
        onboarding_completed: true,
        primary_contact_user_id: null,
        },
        loading: false,
        userRole: { id: 'role-1', user_id: 'test-user-id', organization_id: 'test-org-id', role: 'admin' as const, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
        refetch: vi.fn(),
        isAdmin: true,
        isMember: false,
        isSuperAdmin: false,
        hasOrganization: true,
        needsOnboarding: false,
      });

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ui-language')).toHaveTextContent('no');
        expect(screen.getByTestId('ai-language')).toHaveTextContent('sv');
      });
    });

    it('should handle missing organization gracefully', () => {
      const mockUseOrganization = vi.mocked(require('@/hooks/useOrganization').useOrganization);
      mockUseOrganization.mockReturnValue({
        organization: null,
        loading: false,
        userRole: null,
        error: null,
        refetch: vi.fn(),
        isAdmin: false,
        isMember: false,
        hasOrganization: false,
        needsOnboarding: false,
      });

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('ui-language')).toHaveTextContent('en');
      expect(screen.getByTestId('ai-language')).toHaveTextContent('en');
    });
  });

  describe('Language Switching', () => {
    it('should update UI language correctly', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initial state
      expect(screen.getByTestId('ui-language')).toHaveTextContent('en');

      // Switch to Norwegian
      fireEvent.click(screen.getByTestId('set-ui-no'));

      await waitFor(() => {
        expect(screen.getByTestId('ui-language')).toHaveTextContent('no');
      });
    });

    it('should update AI language correctly', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initial state
      expect(screen.getByTestId('ai-language')).toHaveTextContent('en');

      // Switch to Norwegian
      fireEvent.click(screen.getByTestId('set-ai-no'));

      await waitFor(() => {
        expect(screen.getByTestId('ai-language')).toHaveTextContent('no');
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock Supabase error
      const mockSupabase = vi.mocked(require('@/integrations/supabase/client').supabase);
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: new Error('Database error') }))
          }))
        }))
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Try to switch language
      fireEvent.click(screen.getByTestId('set-ui-no'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error updating UI language:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency correctly for English', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('currency-en')).toHaveTextContent('$1,000');
    });

    it('should format currency correctly for Norwegian', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Switch to Norwegian
      fireEvent.click(screen.getByTestId('set-ui-no'));

      await waitFor(() => {
        expect(screen.getByTestId('currency-en')).toHaveTextContent('kr 1 000');
      });
    });

    it('should format currency correctly for all supported languages', () => {
      const currencyMap: Record<LanguageCode, string> = {
        en: '$1,000',
        no: 'kr 1 000',
        sv: '1 000 kr',
        da: '1.000 kr',
        de: '1.000 €',
        fr: '1 000 €',
        es: '1.000 €',
        it: '1.000 €'
      };

      Object.entries(currencyMap).forEach(([lang, expected]) => {
        const mockUseOrganization = vi.mocked(require('@/hooks/useOrganization').useOrganization);
        mockUseOrganization.mockReturnValue({
          organization: {
            id: 'test-org-id',
            ui_language: lang as LanguageCode,
            ai_response_language: 'en',
            created_by: 'test-user-id',
            name: 'Test Organization',
            org_type: 'nonprofit',
            contact_email: 'test@example.com',
            contact_name: 'Test User',
            contact_phone: '123-456-7890',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            members_count: 1,
            mission: 'Test mission',
            logo_url: null,
            preferred_languages: [lang as LanguageCode],
            funding_needs: [],
            event_types: [],
            onboarding_completed: true,
          },
          loading: false,
          userRole: { id: 'role-1', user_id: 'test-user-id', organization_id: 'test-org-id', role: 'admin' as const, created_at: '2024-01-01T00:00:00Z' },
          error: null,
          refetch: vi.fn(),
          isAdmin: true,
          isMember: false,
          hasOrganization: true,
          needsOnboarding: false,
        });

        const { unmount } = render(
          <LanguageProvider>
            <TestComponent />
          </LanguageProvider>
        );

        expect(screen.getByTestId('currency-en')).toHaveTextContent(expected);
        unmount();
      });
    });

    it('should handle zero and negative amounts', () => {
      const TestCurrencyComponent = () => {
        const { formatCurrency } = useLanguage();
        return (
          <div>
            <span data-testid="zero">{formatCurrency(0)}</span>
            <span data-testid="negative">{formatCurrency(-1000)}</span>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <TestCurrencyComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('zero')).toHaveTextContent('$0');
      expect(screen.getByTestId('negative')).toHaveTextContent('-$1,000');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly for English', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('date-en')).toHaveTextContent('1/15/2024');
    });

    it('should format dates correctly for Norwegian', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Switch to Norwegian
      fireEvent.click(screen.getByTestId('set-ui-no'));

      await waitFor(() => {
        expect(screen.getByTestId('date-en')).toHaveTextContent('15.01.2024');
      });
    });

    it('should handle null and undefined dates', () => {
      const TestDateComponent = () => {
        const { formatDate } = useLanguage();
        return (
          <div>
            <span data-testid="null-date">{formatDate(null)}</span>
            <span data-testid="undefined-date">{formatDate(undefined)}</span>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <TestDateComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('null-date')).toHaveTextContent('N/A');
      expect(screen.getByTestId('undefined-date')).toHaveTextContent('N/A');
    });

    it('should handle invalid dates', () => {
      const TestDateComponent = () => {
        const { formatDate } = useLanguage();
        return (
          <div>
            <span data-testid="invalid-date">{formatDate('invalid-date')}</span>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <TestDateComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('invalid-date')).toHaveTextContent('Invalid Date');
    });

    it('should format dates correctly for all supported languages', () => {
      const dateMap: Record<LanguageCode, string> = {
        en: '1/15/2024',
        no: '15.01.2024',
        sv: '2024-01-15',
        da: '15/01/2024',
        de: '15.01.2024',
        fr: '15/01/2024',
        es: '15/1/2024',
        it: '15/01/2024'
      };

      Object.entries(dateMap).forEach(([lang, expected]) => {
        const mockUseOrganization = vi.mocked(require('@/hooks/useOrganization').useOrganization);
        mockUseOrganization.mockReturnValue({
          organization: {
            id: 'test-org-id',
            ui_language: lang as LanguageCode,
            ai_response_language: 'en',
            created_by: 'test-user-id',
            name: 'Test Organization',
            org_type: 'nonprofit',
            contact_email: 'test@example.com',
            contact_name: 'Test User',
            contact_phone: '123-456-7890',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            members_count: 1,
            mission: 'Test mission',
            logo_url: null,
            preferred_languages: [lang as LanguageCode],
            funding_needs: [],
            event_types: [],
            onboarding_completed: true,
          },
          loading: false,
          userRole: { id: 'role-1', user_id: 'test-user-id', organization_id: 'test-org-id', role: 'admin' as const, created_at: '2024-01-01T00:00:00Z' },
          error: null,
          refetch: vi.fn(),
          isAdmin: true,
          isMember: false,
          hasOrganization: true,
          needsOnboarding: false,
        });

        const { unmount } = render(
          <LanguageProvider>
            <TestComponent />
          </LanguageProvider>
        );

        expect(screen.getByTestId('date-en')).toHaveTextContent(expected);
        unmount();
      });
    });
  });

  describe('Supported Languages', () => {
    it('should include all required languages', () => {
      const expectedLanguages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
        { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
        { code: 'da', name: 'Danish', flag: '🇩🇰' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' }
      ];

      expect(SUPPORTED_LANGUAGES).toHaveLength(8);
      expectedLanguages.forEach(lang => {
        expect(SUPPORTED_LANGUAGES).toContainEqual(lang);
      });
    });

    it('should have unique language codes', () => {
      const codes = SUPPORTED_LANGUAGES.map(lang => lang.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Context Usage', () => {
    it('should throw error when used outside provider', () => {
      const TestComponentWithoutProvider = () => {
        const context = useLanguage();
        return <div>{context.uiLanguage}</div>;
      };

      expect(() => {
        render(<TestComponentWithoutProvider />);
      }).toThrow('useLanguage must be used within a LanguageProvider');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when organization is loading', () => {
      const mockUseOrganization = vi.mocked(require('@/hooks/useOrganization').useOrganization);
      mockUseOrganization.mockReturnValue({
        organization: null,
        loading: true,
        userRole: null,
        error: null,
        refetch: vi.fn(),
        isAdmin: false,
        isMember: false,
        hasOrganization: false,
        needsOnboarding: false,
      });

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    it('should hide loading state when organization is loaded', async () => {
      const mockUseOrganization = vi.mocked(require('@/hooks/useOrganization').useOrganization);
      mockUseOrganization.mockReturnValue({
        organization: {
          id: 'test-org-id',
          ui_language: 'en',
          ai_response_language: 'en',
          created_by: 'test-user-id',
          name: 'Test Organization',
          org_type: 'nonprofit',
          contact_email: 'test@example.com',
          contact_name: 'Test User',
          contact_phone: '123-456-7890',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          members_count: 1,
          mission: 'Test mission',
          logo_url: null,
          preferred_languages: ['en'],
          funding_needs: [],
          event_types: [],
          onboarding_completed: true,
        },
        loading: false,
        userRole: { id: 'role-1', user_id: 'test-user-id', organization_id: 'test-org-id', role: 'admin' as const, created_at: '2024-01-01T00:00:00Z' },
        error: null,
        refetch: vi.fn(),
        isAdmin: true,
        isMember: false,
        hasOrganization: true,
        needsOnboarding: false,
      });

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });
  });
});
