import React, { useState, useEffect } from "react";
import {
  getAuditLogs,
  getAuditedTables,
  exportAuditLogsToCsv,
  AuditLog,
  AuditLogFilters,
} from "../services/auditService";

const SecurityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage] = useState(50);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [tables, setTables] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadLogs();
    loadTables();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, count, error } = await getAuditLogs(filters, page, perPage);
    if (error) {
      console.error("Error loading audit logs:", error);
    } else if (data) {
      setLogs(data);
      setTotal(count);
    }
    setLoading(false);
  };

  const loadTables = async () => {
    const { data } = await getAuditedTables();
    if (data) {
      setTables(data);
    }
  };

  const handleExport = () => {
    if (logs.length > 0) {
      exportAuditLogsToCsv(logs);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400";
      case "UPDATE":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
      case "DELETE":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
      case "LOGIN":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
      case "LOGOUT":
        return "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-400";
      case "AUTH_FAILED":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400";
      default:
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Security Audit Logs
          </h2>
          <p className="text-slate-500 font-bold">
            Comprehensive system activity and change tracking
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={logs.length === 0}
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-2 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined">download</span>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Email, table, or record ID..."
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Table
            </label>
            <select
              value={filters.table_name || ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  table_name: e.target.value || undefined,
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
            >
              <option value="">All Tables</option>
              {tables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Action
            </label>
            <select
              value={filters.action || ""}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value || undefined })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
            >
              <option value="">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="AUTH_FAILED">AUTH_FAILED</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({});
                setPage(0);
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">
              history
            </span>
            <p className="text-slate-400 font-bold">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Table
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Record ID
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Changed Fields
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                        {log.table_name}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {log.record_id?.substring(0, 8) || "N/A"}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.user_email || "System"}
                        </div>
                        {log.user_role && (
                          <div className="text-[10px] text-slate-500">
                            {log.user_role}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {log.changed_fields?.length ? (
                          <span className="font-bold">
                            {log.changed_fields.length} field(s)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-primary hover:text-blue-600 text-xs font-black uppercase"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-bold">
                Showing {page * perPage + 1}-
                {Math.min((page + 1) * perPage, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * perPage >= total}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">
                Audit Log Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">
                  close
                </span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Action
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${getActionColor(selectedLog.action)}`}
                    >
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Timestamp
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatTimestamp(selectedLog.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Table
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedLog.table_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Record ID
                    </label>
                    <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
                      {selectedLog.record_id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      User Email
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedLog.user_email || "System"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      User Role
                    </label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedLog.user_role || "N/A"}
                    </p>
                  </div>
                </div>

                {selectedLog.changed_fields &&
                  selectedLog.changed_fields.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">
                        Changed Fields ({selectedLog.changed_fields.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedLog.changed_fields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Field-by-field comparison */}
                {(selectedLog.old_data || selectedLog.new_data) && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">
                      Changes Overview
                    </label>
                    <div className="space-y-2">
                      {(() => {
                        const oldData = selectedLog.old_data || {};
                        const newData = selectedLog.new_data || {};
                        const allKeys = new Set([
                          ...Object.keys(oldData),
                          ...Object.keys(newData),
                        ]);

                        return Array.from(allKeys).map((key) => {
                          const oldValue = oldData[key];
                          const newValue = newData[key];
                          const hasChanged =
                            JSON.stringify(oldValue) !== JSON.stringify(newValue);

                          // Skip rendering complex objects/arrays in the comparison view
                          const isComplexOld = typeof oldValue === "object" && oldValue !== null;
                          const isComplexNew = typeof newValue === "object" && newValue !== null;

                          if (isComplexOld || isComplexNew) {
                            return (
                              <div
                                key={key}
                                className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                  {key}
                                </div>
                                <div className="text-xs text-slate-500 italic">
                                  Complex data type - see raw data below
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={key}
                              className={`grid grid-cols-2 gap-3 p-3 rounded-lg border ${
                                hasChanged
                                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                                  : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <div className="col-span-2 text-xs font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                {key}
                                {hasChanged && (
                                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded uppercase">
                                    Modified
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  Before
                                </div>
                                <div
                                  className={`text-xs p-2 rounded ${
                                    hasChanged
                                      ? "bg-red-100 dark:bg-red-950/30 text-red-900 dark:text-red-300 font-semibold"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {oldValue !== undefined
                                    ? String(oldValue)
                                    : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  After
                                </div>
                                <div
                                  className={`text-xs p-2 rounded ${
                                    hasChanged
                                      ? "bg-green-100 dark:bg-green-950/30 text-green-900 dark:text-green-300 font-semibold"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {newValue !== undefined
                                    ? String(newValue)
                                    : "—"}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Raw data for reference (collapsed by default) */}
                {(selectedLog.old_data || selectedLog.new_data) && (
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform">
                          chevron_right
                        </span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
                          View Raw JSON Data
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-3">
                      {selectedLog.old_data && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-red-500"></span>
                            Old Data (Raw JSON)
                          </label>
                          <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded-xl text-xs font-mono overflow-x-auto text-red-900 dark:text-red-300">
                            {JSON.stringify(selectedLog.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.new_data && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-green-500"></span>
                            New Data (Raw JSON)
                          </label>
                          <pre className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-4 rounded-xl text-xs font-mono overflow-x-auto text-green-900 dark:text-green-300">
                            {JSON.stringify(selectedLog.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogsView;
