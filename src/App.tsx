import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/providers/AuthProvider';
import { AIProviderProvider } from '@/providers/AIProviderProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import AppRouter from './components/AppRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const isCypress = typeof window !== 'undefined' && (window as any).Cypress;
  return (
    <QueryClientProvider client={queryClient}>
      {isCypress ? (
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            basename={import.meta.env.BASE_URL}
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <OrganizationProvider>
                <AIProviderProvider>
                  <LanguageProvider>
                    <AppRouter />
                  </LanguageProvider>
                </AIProviderProvider>
              </OrganizationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      ) : (
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              basename={import.meta.env.BASE_URL}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AuthProvider>
                <OrganizationProvider>
                  <AIProviderProvider>
                    <LanguageProvider>
                      <AppRouter />
                    </LanguageProvider>
                  </AIProviderProvider>
                </OrganizationProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      )}
    </QueryClientProvider>
  );
};

export default App;
