import React, { useState, useEffect, useMemo } from 'react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate session ID once
  const sessionId = useMemo(() =>
    Math.random().toString(36).substring(7).toUpperCase(),
    []
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isProcessing) {
      timeoutId = setTimeout(() => {
        setIsProcessing(false);
        onConfirm();
      }, 1500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isProcessing, onConfirm]);

  if (!isOpen) return null;

  const handleLogoutClick = () => {
    setIsProcessing(true);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      style={{ animation: 'fadeIn 0.3s ease-in-out' }}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300"
        style={{ animation: 'scaleIn 0.3s ease-in-out' }}
      >
        <div className="p-6 md:p-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-[28px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 border border-rose-500/20">
            {isProcessing ? (
              <span className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            ) : (
              <svg
                className="w-10 h-10 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {isProcessing ? 'Revoking Access' : 'Confirm Logout'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {isProcessing
                ? 'Securing your administrative session and clearing cached credentials. Please wait...'
                : 'Are you sure you want to end your current session? You will need to re-authenticate to access the administrative dashboard.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleLogoutClick}
              disabled={isProcessing}
              className="w-full py-4 bg-rose-500 text-white text-xs font-black rounded-2xl shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-all uppercase tracking-[0.2em] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Sign Out Securely'
              )}
            </button>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="w-full py-4 text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-[0.2em] transition-colors"
              >
                Stay Signed In
              </button>
            )}
          </div>
        </div>

        <div className="px-10 py-4 bg-slate-50 dark:bg-gray-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isProcessing ? 'Performing Security Wipe...' : 'Session Security Active'} • ID: {sessionId}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default LogoutModal;