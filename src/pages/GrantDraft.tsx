import { GrantDraftEditor } from '@/components/grant-draft/GrantDraftEditor';
import { MobileGrantEditor } from '@/components/grant-draft/MobileGrantEditor';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

export default function GrantDraft() {
  const isMobile = useIsMobile();
  
  return (
    <ProtectedRoute>
      <ErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
            <div className="max-w-md text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground">
                The grant editor encountered an error. Your draft is saved and will be available when you reload.
              </p>
              <Button onClick={() => window.location.reload()} size="lg">
                Reload Editor
              </Button>
            </div>
          </div>
        }
      >
        {isMobile ? <MobileGrantEditor /> : <GrantDraftEditor />}
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
