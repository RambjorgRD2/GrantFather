import React from 'react';
import { UnifiedHeader } from './UnifiedHeader';
import { RouteTransition } from './RouteTransition';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
    </div>
  );
}
