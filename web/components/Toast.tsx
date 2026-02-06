
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
}

interface ToastContextValue {
  toast: (message: string, severity?: ToastSeverity) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const SEVERITY_STYLES: Record<ToastSeverity, string> = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error:   'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info:    'bg-blue-50 border-blue-400 text-blue-800',
};

const SEVERITY_ICONS: Record<ToastSeverity, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-sm animate-in slide-in-from-top-2 fade-in duration-200 ${SEVERITY_STYLES[item.severity]}`}>
      <span className="font-bold mt-0.5 shrink-0">{SEVERITY_ICONS[item.severity]}</span>
      <span className="text-sm leading-snug">{item.message}</span>
      <button onClick={onDismiss} className="ml-auto shrink-0 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, severity: ToastSeverity = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, severity }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <ToastItem item={item} onDismiss={() => dismiss(item.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
