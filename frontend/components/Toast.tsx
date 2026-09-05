'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  txHash?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, txHash?: string) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, txHash?: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message, txHash }]);
    // Auto-remove after 5s (10s for tx toasts)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, txHash ? 10000 : 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ── Container ───────────────────────────────────────────── */
function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext)!;
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

/* ── Individual Toast ────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  const basescanUrl = toast.txHash
    ? `https://basescan.org/tx/${toast.txHash}`
    : null;

  return (
    <div
      className={`pointer-events-auto animate-slide-in-right border rounded-xl px-4 py-3 backdrop-blur-md shadow-lg ${colors[toast.type]}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm font-bold mt-0.5">{icons[toast.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed">{toast.message}</p>
          {basescanUrl && (
            <a
              href={basescanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] underline opacity-70 hover:opacity-100 mt-1 inline-block"
            >
              View on Basescan →
            </a>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-xs opacity-50 hover:opacity-100 transition-opacity ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
