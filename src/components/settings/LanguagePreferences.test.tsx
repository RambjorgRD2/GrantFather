import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguagePreferences } from './LanguagePreferences';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the LanguageSelector component
vi.mock('@/components/ui/language-selector', () => ({
  LanguageSelector: ({ type }: { type: 'ui' | 'ai' }) => (
    <div data-testid={`${type}-language-selector`}>
      <button data-testid={`${type}-selector-button`}>Change {type} Language</button>
    </div>
  )
}));

describe('LanguagePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <LanguageProvider>
        {component}
      </LanguageProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render the main title and description', () => {
      renderWithProvider(<LanguagePreferences />);

      expect(screen.getByText('Language Preferences')).toBeInTheDocument();
      expect(screen.getByText(/Configure interface language and AI response language/)).toBeInTheDocument();
    });

    it('should render both language preference cards', () => {
      renderWithProvider(<LanguagePreferences />);

      // Interface Language card
      expect(screen.getByText('Interface Language')).toBeInTheDocument();
      expect(screen.getByText(/Language used for the application interface/)).toBeInTheDocument();

      // AI Response Language card
      expect(screen.getByText('AI Response Language')).toBeInTheDocument();
      expect(screen.getByText(/Language for AI-generated content and responses/)).toBeInTheDocument();
    });

    it('should display current language information', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should show current UI language
      expect(screen.getByText('Current Language')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();

      // Should show current AI language
      expect(screen.getAllByText('Current Language')).toHaveLength(2);
      expect(screen.getAllByText('🇺🇸')).toHaveLength(2);
      expect(screen.getAllByText('English')).toHaveLength(2);
    });

    it('should render language selectors', () => {
      renderWithProvider(<LanguagePreferences />);

      expect(screen.getByTestId('ui-language-selector')).toBeInTheDocument();
      expect(screen.getByTestId('ai-language-selector')).toBeInTheDocument();
      expect(screen.getByTestId('ui-selector-button')).toBeInTheDocument();
      expect(screen.getByTestId('ai-selector-button')).toBeInTheDocument();
    });
  });

  describe('Interface Language Section', () => {
    it('should display interface language effects', () => {
      renderWithProvider(<LanguagePreferences />);

      const interfaceCard = screen.getByText('Interface Language').closest('.glass');
      expect(interfaceCard).toBeInTheDocument();

      // Check effects list
      expect(screen.getByText('Affects:')).toBeInTheDocument();
      expect(screen.getByText('Menu and button labels')).toBeInTheDocument();
      expect(screen.getByText('Date formatting:')).toBeInTheDocument();
      expect(screen.getByText('Currency formatting:')).toBeInTheDocument();
      expect(screen.getByText('Number and time formats')).toBeInTheDocument();
    });

    it('should show currency formatting example', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should show formatted currency (default English)
      expect(screen.getByText(/\$10,000/)).toBeInTheDocument();
    });

    it('should show date formatting example', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should show formatted date (default English)
      expect(screen.getByText(/1\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
    });
  });

  describe('AI Response Language Section', () => {
    it('should display AI language effects', () => {
      renderWithProvider(<LanguagePreferences />);

      const aiCard = screen.getByText('AI Response Language').closest('.glass');
      expect(aiCard).toBeInTheDocument();

      // Check effects list
      expect(screen.getByText('Generated grant content')).toBeInTheDocument();
      expect(screen.getByText('AI suggestions and improvements')).toBeInTheDocument();
      expect(screen.getByText('Section regeneration')).toBeInTheDocument();
      expect(screen.getByText('Application drafts')).toBeInTheDocument();
    });
  });

  describe('Supported Languages Section', () => {
    it('should display all supported languages', () => {
      renderWithProvider(<LanguagePreferences />);

      expect(screen.getByText('Supported Languages')).toBeInTheDocument();
      expect(screen.getByText(/Languages available for interface and AI responses/)).toBeInTheDocument();

      // Check all 8 supported languages are displayed
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('🇳🇴')).toBeInTheDocument();
      expect(screen.getByText('Norwegian')).toBeInTheDocument();
      expect(screen.getByText('🇸🇪')).toBeInTheDocument();
      expect(screen.getByText('Swedish')).toBeInTheDocument();
      expect(screen.getByText('🇩🇰')).toBeInTheDocument();
      expect(screen.getByText('Danish')).toBeInTheDocument();
      expect(screen.getByText('🇩🇪')).toBeInTheDocument();
      expect(screen.getByText('German')).toBeInTheDocument();
      expect(screen.getByText('🇫🇷')).toBeInTheDocument();
      expect(screen.getByText('French')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('🇮🇹')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
    });

    it('should display language features information', () => {
      renderWithProvider(<LanguagePreferences />);

      expect(screen.getByText('Language Features:')).toBeInTheDocument();
      expect(screen.getByText(/Auto-Detection:/)).toBeInTheDocument();
      expect(screen.getByText(/Localized Formatting:/)).toBeInTheDocument();
      expect(screen.getByText(/Cultural Context:/)).toBeInTheDocument();
      expect(screen.getByText(/Mixed Content:/)).toBeInTheDocument();
    });
  });

  describe('Best Practices Section', () => {
    it('should display best practices information', () => {
      renderWithProvider(<LanguagePreferences />);

      expect(screen.getByText('Best Practices')).toBeInTheDocument();

      // Check all best practices are listed
      expect(screen.getByText(/Interface Language:/)).toBeInTheDocument();
      expect(screen.getByText(/AI Language:/)).toBeInTheDocument();
      expect(screen.getByText(/Consistency:/)).toBeInTheDocument();
      expect(screen.getByText(/Knowledge Base:/)).toBeInTheDocument();
    });

    it('should provide helpful guidance for each practice', () => {
      renderWithProvider(<LanguagePreferences />);

      // Interface Language guidance
      expect(screen.getByText(/Choose the language your team is most comfortable with/)).toBeInTheDocument();

      // AI Language guidance
      expect(screen.getByText(/Select the language you want grant applications written in/)).toBeInTheDocument();

      // Consistency guidance
      expect(screen.getByText(/Keep AI language consistent across all grant applications/)).toBeInTheDocument();

      // Knowledge Base guidance
      expect(screen.getByText(/Create knowledge base entries in your AI response language/)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have proper CSS classes for styling', () => {
      renderWithProvider(<LanguagePreferences />);

      // Check for glass effect classes
      const cards = screen.getAllByRole('article');
      cards.forEach(card => {
        expect(card).toHaveClass('glass');
      });

      // Check for accent border on best practices card
      const bestPracticesCard = screen.getByText('Best Practices').closest('.glass');
      expect(bestPracticesCard).toHaveClass('border-accent/20');
    });

    it('should have proper semantic structure', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should have main heading
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

      // Should have multiple cards
      const cards = screen.getAllByRole('article');
      expect(cards.length).toBeGreaterThan(2);
    });

    it('should have proper accessibility attributes', () => {
      renderWithProvider(<LanguagePreferences />);

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper button elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layout', () => {
      renderWithProvider(<LanguagePreferences />);

      // Check for responsive grid classes
      const gridContainer = screen.getByText('Interface Language').closest('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('should have responsive language grid', () => {
      renderWithProvider(<LanguagePreferences />);

      // Check for responsive language display grid
      const languageGrid = screen.getByText('Supported Languages').closest('.grid');
      expect(languageGrid).toHaveClass('md:grid-cols-4');
    });
  });

  describe('Icon Integration', () => {
    it('should display proper icons for each section', () => {
      renderWithProvider(<LanguagePreferences />);

      // Interface language icon
      const interfaceIcon = screen.getByText('Interface Language').closest('.flex');
      expect(interfaceIcon).toBeInTheDocument();

      // AI language icon
      const aiIcon = screen.getByText('AI Response Language').closest('.flex');
      expect(aiIcon).toBeInTheDocument();

      // Supported languages icon
      const supportedIcon = screen.getByText('Supported Languages').closest('.flex');
      expect(supportedIcon).toBeInTheDocument();

      // Best practices icon
      const bestPracticesIcon = screen.getByText('Best Practices').closest('.flex');
      expect(bestPracticesIcon).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('should display accurate currency formatting examples', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should show proper currency format for English
      const currencyText = screen.getByText(/Currency formatting:/);
      expect(currencyText).toBeInTheDocument();
      expect(currencyText.textContent).toMatch(/\$[\d,]+/);
    });

    it('should display accurate date formatting examples', () => {
      renderWithProvider(<LanguagePreferences />);

      // Should show proper date format for English
      const dateText = screen.getByText(/Date formatting:/);
      expect(dateText).toBeInTheDocument();
      expect(dateText.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should have consistent language information', () => {
      renderWithProvider(<LanguagePreferences />);

      // All language references should be consistent
      const englishReferences = screen.getAllByText('English');
      expect(englishReferences.length).toBeGreaterThan(0);

      const flagReferences = screen.getAllByText('🇺🇸');
      expect(flagReferences.length).toBeGreaterThan(0);
    });
  });
});
