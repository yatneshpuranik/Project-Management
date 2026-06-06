import React, { useEffect, useState } from 'react';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineX } from 'react-icons/hi';

const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type, id } = e.detail;
      setToasts((prev) => [...prev, { message, type, id }]);

      // Auto remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 animate-slide-in ${
              isSuccess 
                ? 'border-emerald-500/20 bg-slate-900/90 text-emerald-300' 
                : isError 
                  ? 'border-rose-500/20 bg-slate-900/90 text-rose-300' 
                  : 'border-sky-500/20 bg-slate-900/90 text-sky-300'
            }`}
          >
            {isSuccess && <HiOutlineCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400" />}
            {isError && <HiOutlineExclamationCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />}
            {!isSuccess && !isError && <HiOutlineInformationCircle className="h-5 w-5 flex-shrink-0 text-sky-400" />}
            
            <p className="text-sm font-medium text-slate-100 flex-1">{t.message}</p>
            
            <button
              onClick={() => removeToast(t.id)}
              className="rounded-lg p-1 hover:bg-white/5 text-slate-400 hover:text-slate-200"
            >
              <HiOutlineX className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
