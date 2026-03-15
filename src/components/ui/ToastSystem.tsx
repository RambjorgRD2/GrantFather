/**
 * Enhanced Toast Notification System
 * Provides rich toast notifications with different types and actions
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from './button';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  action: () => void;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
  timestamp: number;
}

export interface ToastSystemProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  maxToasts?: number;
  className?: string;
}

export function ToastSystem({
  toasts,
  onRemove,
  position = 'top-right',
  maxToasts = 5,
  className,
}: ToastSystemProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getToastBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      case 'loading':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const displayedToasts = toasts.slice(0, maxToasts);

  return (
    <div
      className={cn('fixed z-50 space-y-2', getPositionClasses(), className)}
    >
      {displayedToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          getToastIcon={getToastIcon}
          getToastBorderColor={getToastBorderColor}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  getToastIcon: (type: ToastType) => React.ReactNode;
  getToastBorderColor: (type: ToastType) => string;
}

function ToastItem({
  toast,
  onRemove,
  getToastIcon,
  getToastBorderColor,
}: ToastItemProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (toast.duration && !toast.persistent) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.persistent]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-96 transform transition-all duration-300',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
        getToastBorderColor(toast.type),
        'border-l-4'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getToastIcon(toast.type)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={handleRemove}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {toast.actions && toast.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {toast.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={action.action}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Toast context and provider
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (toast: Omit<Toast, 'id' | 'timestamp'>) => {
      const id = crypto.randomUUID();
      const newToast: Toast = {
        ...toast,
        id,
        timestamp: Date.now(),
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = React.useCallback(
    (id: string, updates: Partial<Toast>) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id ? { ...toast, ...updates } : toast
        )
      );
    },
    []
  );

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    updateToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastSystem toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
