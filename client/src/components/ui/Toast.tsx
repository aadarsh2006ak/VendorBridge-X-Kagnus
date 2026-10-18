import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, options?: { type?: ToastType; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, options?: { type?: ToastType; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id,
        title,
        type: options?.type || 'info',
        message: options?.message,
      };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      toast(title, { type: 'success', message });
    },
    [toast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      toast(title, { type: 'error', message });
    },
    [toast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      toast(title, { type: 'info', message });
    },
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl bg-surface transition-all animate-in slide-in-from-bottom-3 duration-200',
              t.type === 'success' && 'border-status-success/40 bg-emerald-950/90 text-white',
              t.type === 'error' && 'border-status-danger/40 bg-red-950/90 text-white',
              t.type === 'info' && 'border-border-default bg-surface text-primary'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-status-success" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-status-danger" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-status-info" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-sm font-semibold">{t.title}</h4>
              {t.message && <p className="text-xs opacity-90 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-muted hover:text-white rounded transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
