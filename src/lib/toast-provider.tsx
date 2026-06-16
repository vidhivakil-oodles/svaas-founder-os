'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { id, message, type, createdAt: Date.now() };
    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Toast Render */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-right fade-in duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-red-950/90 border-red-700/50 text-red-200'
                  : 'bg-zinc-900/90 border-zinc-700/50 text-zinc-200'
              }`}
              onClick={() => dismissToast(toast.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
                </span>
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
