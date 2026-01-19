import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  type: "audit" | "system" | "alert" | "info";
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  metadata?: any;
  created_at: string;
}

export interface AuditNotification {
  action: string;
  table_name: string;
  user_email: string;
  record_id: string;
  changed_fields?: string[];
}

let notificationChannel: RealtimeChannel | null = null;

/**
 * Hook to listen for real-time audit log changes
 */
export function useAuditNotifications(
  onNewLog?: (notification: AuditNotification) => void,
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to audit_logs table changes
    notificationChannel = supabase
      .channel("audit-logs-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
        },
        (payload) => {
          const log = payload.new as any;

          // Create notification from audit log
          const notification: AuditNotification = {
            action: log.action,
            table_name: log.table_name,
            user_email: log.user_email || "System",
            record_id: log.record_id,
            changed_fields: log.changed_fields,
          };

          if (onNewLog) {
            onNewLog(notification);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          console.log("Connected to audit logs real-time channel");
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false);
          console.error("Failed to connect to audit logs channel");
        }
      });

    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
        notificationChannel = null;
        setIsConnected(false);
      }
    };
  }, [onNewLog]);

  return { isConnected };
}

/**
 * Hook to manage in-app notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
      } catch (error) {
        console.error("Failed to parse stored notifications:", error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("notifications", JSON.stringify(notifications));
      setUnreadCount(notifications.filter((n) => !n.read).length);
    }
  }, [notifications]);

  const addNotification = (
    notification: Omit<Notification, "id" | "created_at" | "read">,
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 100)); // Keep max 100 notifications
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("notifications");
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}

/**
 * Format audit notification for display
 */
export function formatAuditNotification(
  auditNotification: AuditNotification,
): Omit<Notification, "id" | "created_at" | "read"> {
  const actionColors = {
    INSERT: { severity: "low" as const, icon: "add_circle" },
    UPDATE: { severity: "medium" as const, icon: "edit" },
    DELETE: { severity: "high" as const, icon: "delete" },
    LOGIN: { severity: "low" as const, icon: "login" },
    LOGOUT: { severity: "low" as const, icon: "logout" },
    AUTH_FAILED: { severity: "high" as const, icon: "warning" },
    PASSWORD_RESET: { severity: "medium" as const, icon: "lock_reset" },
  };

  const config =
    actionColors[auditNotification.action as keyof typeof actionColors] ||
    actionColors.UPDATE;

  let title = "";
  let message = "";

  switch (auditNotification.action) {
    case "INSERT":
      title = `New ${auditNotification.table_name} Created`;
      message = `${auditNotification.user_email} created a new record`;
      break;
    case "UPDATE":
      title = `${auditNotification.table_name} Updated`;
      message = `${auditNotification.user_email} updated ${auditNotification.changed_fields?.length || 0} field(s)`;
      break;
    case "DELETE":
      title = `${auditNotification.table_name} Deleted`;
      message = `${auditNotification.user_email} deleted a record`;
      break;
    case "LOGIN":
      title = "User Login";
      message = `${auditNotification.user_email} logged in`;
      break;
    case "LOGOUT":
      title = "User Logout";
      message = `${auditNotification.user_email} logged out`;
      break;
    case "AUTH_FAILED":
      title = "Failed Login Attempt";
      message = `Failed login attempt for ${auditNotification.user_email}`;
      break;
    case "PASSWORD_RESET":
      title = "Password Reset";
      message = `${auditNotification.user_email} reset their password`;
      break;
    default:
      title = `${auditNotification.action} on ${auditNotification.table_name}`;
      message = `Action performed by ${auditNotification.user_email}`;
  }

  return {
    type: "audit",
    title,
    message,
    severity: config.severity,
    metadata: auditNotification,
  };
}
