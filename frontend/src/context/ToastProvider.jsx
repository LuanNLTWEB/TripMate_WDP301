import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext';

const toastConfig = {
  success: { icon: 'bi-check-circle-fill', title: 'Thành công' },
  error: { icon: 'bi-exclamation-octagon-fill', title: 'Có lỗi xảy ra' },
  warning: { icon: 'bi-exclamation-triangle-fill', title: 'Cảnh báo' },
  info: { icon: 'bi-info-circle-fill', title: 'Thông báo' }
};

let nextToastId = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return null;

    const type = toastConfig[options.type] ? options.type : 'info';
    const id = ++nextToastId;
    const duration = options.duration ?? (type === 'error' ? 6000 : 4000);
    const toast = {
      id,
      message,
      type,
      title: options.title || toastConfig[type].title,
      duration
    };

    setToasts((current) => [...current.slice(-3), toast]);

    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({
    showToast,
    removeToast,
    success: (message, options) => showToast(message, { ...options, type: 'success' }),
    error: (message, options) => showToast(message, { ...options, type: 'error' }),
    warning: (message, options) => showToast(message, { ...options, type: 'warning' }),
    info: (message, options) => showToast(message, { ...options, type: 'info' })
  }), [removeToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="tm-toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          return (
            <div
              key={toast.id}
              className={`tm-toast tm-toast-${toast.type}`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <div className="tm-toast-icon" aria-hidden="true">
                <i className={`bi ${config.icon}`}></i>
              </div>
              <div className="tm-toast-content">
                <strong>{toast.title}</strong>
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                className="tm-toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
              >
                <i className="bi bi-x-lg"></i>
              </button>
              {toast.duration > 0 && (
                <span
                  className="tm-toast-progress"
                  style={{ animationDuration: `${toast.duration}ms` }}
                  aria-hidden="true"
                ></span>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
