import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageSelector } from './language-selector';
import { LanguageProvider } from '@/contexts/LanguageContext';

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<LanguageProvider>{component}</LanguageProvider>);
  };

  describe('Component Rendering', () => {
    it('should render UI language selector correctly', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should render AI language selector correctly', () => {
      renderWithProvider(<LanguageSelector type="ai" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should have proper CSS classes', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('gap-2', 'bg-card');
    });
  });

  describe('Different Types', () => {
    it('should render both UI and AI selectors', () => {
      renderWithProvider(
        <div>
          <LanguageSelector type="ui" />
          <LanguageSelector type="ai" />
        </div>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Visual States', () => {
    it('should have proper button styling', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'inline-flex',
        'items-center',
        'justify-center'
      );
    });

    it('should have focus styles', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should have proper button role', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should hide flag on small screens', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const flagSpan = screen.getByText('🇺🇸').closest('span');
      expect(flagSpan).toHaveClass('hidden', 'sm:inline');
    });

    it('should hide language name on medium screens', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const nameSpan = screen.getByText('English').closest('span');
      expect(nameSpan).toHaveClass('hidden', 'md:inline');
    });
  });

  describe('Component Props', () => {
    it('should accept different variants', () => {
      renderWithProvider(<LanguageSelector type="ui" variant="ghost" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should accept different sizes', () => {
      renderWithProvider(<LanguageSelector type="ui" size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing language context gracefully', () => {
      expect(() => {
        render(<LanguageSelector type="ui" />);
      }).toThrow('useLanguage must be used within a LanguageProvider');
    });
  });

  describe('Language Display', () => {
    it('should display current language information', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      // Should show current language flag and name
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should display globe icon', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      // Should have globe icon
      const globeIcon = document.querySelector('.lucide-globe');
      expect(globeIcon).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have proper button structure', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');

      // Should contain flag and name spans
      const flagSpan = button.querySelector('span');
      const nameSpan = button.querySelectorAll('span')[1];

      expect(flagSpan).toHaveTextContent('🇺🇸');
      expect(nameSpan).toHaveTextContent('English');
    });

    it('should have proper icon structure', () => {
      renderWithProvider(<LanguageSelector type="ui" />);

      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');

      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('lucide-globe');
    });
  });
});
