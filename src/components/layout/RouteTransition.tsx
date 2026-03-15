import React from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: React.ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="transition-opacity duration-200 ease-in-out"
    >
      {children}
    </div>
  );
}
