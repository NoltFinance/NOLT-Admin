
import React from 'react';
import { AppNotification } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAllRead, 
  onClearAll 
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'loan': return 'payments';
      case 'investment': return 'trending_up';
      case 'security': return 'security';
      default: return 'info';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'loan': return 'text-emerald-500 bg-emerald-500/10';
      case 'investment': return 'text-primary bg-primary/10';
      case 'security': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white dark:bg-surface-dark z-[101] shadow-2xl border-l border-slate-100 dark:border-slate-800 transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Notification Center</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Updates and System Alerts</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-background-dark text-slate-400 hover:text-rose-500 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    notif.isRead 
                      ? 'bg-transparent border-slate-100 dark:border-slate-800' 
                      : 'bg-primary/5 border-primary/20 shadow-sm'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${getColor(notif.type)}`}>
                      <span className="material-symbols-outlined text-[20px]">{getIcon(notif.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-wider">{notif.title}</h4>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{notif.timestamp}</span>
                        {notif.referenceId && (
                          <span className="text-[10px] font-mono font-bold text-primary">{notif.referenceId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-30 gap-3">
                <span className="material-symbols-outlined text-6xl">notifications_off</span>
                <p className="font-black text-sm uppercase tracking-widest">No notifications yet</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <button 
              onClick={onMarkAllRead}
              className="px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
            >
              Mark all as read
            </button>
            <button 
              onClick={onClearAll}
              className="px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
            >
              Clear all history
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default NotificationPanel;
