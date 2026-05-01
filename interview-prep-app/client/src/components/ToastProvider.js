import React, { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl border ${
              toast.type === 'error'
                ? 'bg-red-600/95 border-red-500 text-white'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <span className="text-xl leading-none">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <div className="text-sm leading-5">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
