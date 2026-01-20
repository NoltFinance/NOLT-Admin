import supabase from "@/utils/supabase";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string | null;
  action:
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "AUTH_FAILED"
    | "PASSWORD_RESET";
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  table_name?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

/**
 * Fetch audit logs with optional filters and pagination
 */
export async function getAuditLogs(
  filters?: AuditLogFilters,
  page = 0,
  perPage = 50,
) {
  try {
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters?.table_name) {
      query = query.eq("table_name", filters.table_name);
    }

    if (filters?.action) {
      query = query.eq("action", filters.action);
    }

    if (filters?.user_id) {
      query = query.eq("user_id", filters.user_id);
    }

    if (filters?.start_date) {
      query = query.gte("created_at", filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte("created_at", filters.end_date);
    }

    if (filters?.search) {
      query = query.or(
        `user_email.ilike.%${filters.search}%,table_name.ilike.%${filters.search}%,record_id.ilike.%${filters.search}%`,
      );
    }

    // Apply pagination
    const start = page * perPage;
    const end = start + perPage - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data as AuditLog[], count: count || 0, error: null };
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return { data: null, count: 0, error: error.message };
  }
}

/**
 * Get audit logs for a specific record
 */
export async function getRecordAuditHistory(
  tableName: string,
  recordId: string,
) {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", tableName)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { data: data as AuditLog[], error: null };
  } catch (error: any) {
    console.error("Error fetching record audit history:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Get client IP address using external service
 */
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error("Error fetching IP address:", error);
    return null;
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats() {
  try {
    const { data, error } = await supabase.rpc("get_audit_stats");

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching audit stats:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Log authentication event from client (supplement to server-side logging)
 */
export async function logAuthEvent(
  action: "LOGIN" | "LOGOUT" | "AUTH_FAILED" | "PASSWORD_RESET",
  userId?: string,
  userEmail?: string,
) {
  try {
    // Get client IP address
    const ipAddress = await getClientIP();

    const { error } = await supabase.rpc("log_auth_event", {
      p_action: action,
      p_user_id: userId || null,
      p_user_email: userEmail || null,
      p_ip_address: ipAddress,
      p_user_agent: navigator.userAgent,
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error logging auth event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Log workflow action to audit logs
 */
export async function logWorkflowAction(
  action: "UPDATE",
  recordId: string,
  details: {
    fromStatus?: string;
    toStatus?: string;
    workflowAction?: string;
    comment?: string;
    eligibleAmount?: string;
    reassignedTo?: string;
    reassignedFrom?: string;
    [key: string]: any;
  },
  userId?: string,
  userEmail?: string,
  userRole?: string,
) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      table_name: "form_submissions",
      record_id: recordId,
      action: action,
      old_data: details.fromStatus ? { status: details.fromStatus } : null,
      new_data: {
        status: details.toStatus,
        workflow_action: details.workflowAction,
        comment: details.comment,
        eligible_amount: details.eligibleAmount,
        reassigned_to: details.reassignedTo,
        reassigned_from: details.reassignedFrom,
        ...details,
      },
      changed_fields: Object.keys(details).filter(k => details[k] !== undefined),
      user_id: userId || null,
      user_email: userEmail || null,
      user_role: userRole || null,
    });

    if (error) {
      console.error("Error logging workflow action:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error logging workflow action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unique table names from audit logs
 */
export async function getAuditedTables() {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("table_name")
      .order("table_name");

    if (error) throw error;

    // Get unique table names
    const uniqueTables = [...new Set(data.map((log) => log.table_name))];

    return { data: uniqueTables, error: null };
  } catch (error: any) {
    console.error("Error fetching audited tables:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCsv(logs: AuditLog[]) {
  const headers = [
    "Timestamp",
    "Table",
    "Record ID",
    "Action",
    "User Email",
    "User Role",
    "Changed Fields",
  ];

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.table_name,
    log.record_id || "",
    log.action,
    log.user_email || "System",
    log.user_role || "",
    log.changed_fields?.join(", ") || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `audit_logs_${Date.now()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
