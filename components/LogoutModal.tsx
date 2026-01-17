
import React, { useState } from 'react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleLogoutClick = () => {
    setIsProcessing(true);
    // Simulate session revocation and secure data wipe
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-[28px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 border border-rose-500/20">
            {isProcessing ? (
              <span className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-4xl animate-pulse">power_settings_new</span>
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
        
        <div className="px-10 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isProcessing ? 'Performing Security Wipe...' : 'Session Security Active'} • ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
