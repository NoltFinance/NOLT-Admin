import React, { useEffect } from "react";
import {
  useNotifications,
  useAuditNotifications,
  formatAuditNotification,
} from "../utils/notificationService";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  // Subscribe to real-time audit logs
  const { isConnected } = useAuditNotifications((auditLog) => {
    // Convert audit log to notification and add to list
    const notification = formatAuditNotification(auditLog);
    addNotification(notification);

    // Show browser notification if permission granted
    if (Notification.permission === "granted" && !isOpen) {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/logo.png",
        badge: "/logo.png",
      });
    }
  });

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const getIcon = (type: string, severity?: string) => {
    if (type === "audit") {
      switch (severity) {
        case "critical":
          return "error";
        case "high":
          return "warning";
        case "medium":
          return "info";
        default:
          return "notifications";
      }
    }
    switch (type) {
      case "loan":
        return "payments";
      case "investment":
        return "trending_up";
      case "security":
        return "security";
      case "system":
        return "settings";
      case "alert":
        return "campaign";
      default:
        return "info";
    }
  };

  const getColor = (type: string, severity?: string) => {
    if (type === "audit") {
      switch (severity) {
        case "critical":
          return "text-red-500 bg-red-500/10";
        case "high":
          return "text-orange-500 bg-orange-500/10";
        case "medium":
          return "text-blue-500 bg-blue-500/10";
        default:
          return "text-slate-500 bg-slate-500/10";
      }
    }
    switch (type) {
      case "loan":
        return "text-emerald-500 bg-emerald-500/10";
      case "investment":
        return "text-primary bg-primary/10";
      case "security":
        return "text-rose-500 bg-rose-500/10";
      case "alert":
        return "text-amber-500 bg-amber-500/10";
      default:
        return "text-slate-500 bg-slate-500/10";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
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
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white dark:bg-surface-dark z-[101] shadow-2xl border-l border-slate-100 dark:border-slate-800 transition-transform duration-500 ease-out transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Notification Center
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {unreadCount > 0 && `${unreadCount} Unread • `}
                  Real-time Updates
                </p>
                {isConnected && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">
                      Live
                    </span>
                  </div>
                )}
              </div>
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
                    notif.read
                      ? "bg-transparent border-slate-100 dark:border-slate-800"
                      : "bg-primary/5 border-primary/20 shadow-sm"
                  }`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${getColor(notif.type, notif.severity)}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {getIcon(notif.type, notif.severity)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-wider">
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse mt-1" />
                          )}
                          <button
                            onClick={() => clearNotification(notif.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              close
                            </span>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {formatTimestamp(notif.created_at)}
                        </span>
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="text-[10px] font-bold text-primary hover:underline"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-30 gap-3">
                <span className="material-symbols-outlined text-6xl">
                  notifications_off
                </span>
                <p className="font-black text-sm uppercase tracking-widest">
                  No notifications yet
                </p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
