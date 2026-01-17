
import React, { useState } from 'react';
import { SecurityLog } from '../types';
import { downloadAsCSV } from '../utils/exportUtils';

const INITIAL_LOGS: SecurityLog[] = [
  {
    id: 'L1',
    timestamp: '2023-10-24 14:22:05',
    actor: { name: 'Alex Morgan', email: 'alex.m@nolt.finance', avatar: 'https://picsum.photos/seed/admin/100/100' },
    event: 'Data Export',
    details: 'Exported 142 investment records (Full PII Dataset) to CSV file',
    ipAddress: '192.168.1.45',
    severity: 'Medium'
  },
  {
    id: 'L2',
    timestamp: '2023-10-24 14:18:12',
    actor: { name: 'Tunde Bakare', email: 't.bakare@nolt.finance', avatar: 'https://picsum.photos/seed/tunde/100/100' },
    event: 'Sensitive Access',
    details: 'Viewed BVN for applicant David Chen (#REQ-8821)',
    ipAddress: '192.168.1.12',
    severity: 'High'
  },
  {
    id: 'L3',
    timestamp: '2023-10-24 13:45:00',
    actor: { name: 'Alex Morgan', email: 'alex.m@nolt.finance', avatar: 'https://picsum.photos/seed/admin/100/100' },
    event: 'Role Change',
    details: 'Changed role of Chidi Okoro from Sales Officer to Suspended',
    ipAddress: '192.168.1.45',
    severity: 'Critical'
  },
  {
    id: 'L4',
    timestamp: '2023-10-24 12:10:33',
    actor: { name: 'Sarah Jenkins', email: 's.jenkins@nolt.finance', avatar: 'https://picsum.photos/seed/sarahj/100/100' },
    event: 'User Login',
    details: 'Successful administrator login (MFA Verified)',
    ipAddress: '104.22.1.89',
    severity: 'Low'
  },
  {
    id: 'L5',
    timestamp: '2023-10-24 11:30:15',
    actor: { name: 'Tunde Bakare', email: 't.bakare@nolt.finance', avatar: 'https://picsum.photos/seed/tunde/100/100' },
    event: 'Document Download',
    details: 'Downloaded Bank Statement for applicant Sarah Miller (#REQ-8822)',
    ipAddress: '192.168.1.12',
    severity: 'Medium'
  },
  {
    id: 'L6',
    timestamp: '2023-10-24 10:05:44',
    actor: { name: 'Alex Morgan', email: 'alex.m@nolt.finance', avatar: 'https://picsum.photos/seed/admin/100/100' },
    event: 'Security Config',
    details: 'Regenerated Production Webhook Secret Key',
    ipAddress: '192.168.1.45',
    severity: 'Critical'
  },
  {
    id: 'L7',
    timestamp: '2023-10-24 09:22:11',
    actor: { name: 'Jessica Wu', email: 'j.wu@nolt.finance', avatar: 'https://picsum.photos/seed/jess/100/100' },
    event: 'Sensitive Copy',
    details: 'Copied NIN/Identification ID for applicant James Wilson (#REQ-8823)',
    ipAddress: '192.168.1.20',
    severity: 'High'
  },
  {
    id: 'L8',
    timestamp: '2023-10-24 08:15:22',
    actor: { name: 'Sarah Jenkins', email: 's.jenkins@nolt.finance', avatar: 'https://picsum.photos/seed/sarahj/100/100' },
    event: 'Referral Set',
    details: 'Manually assigned referral code "SALE-S99" to self',
    ipAddress: '104.22.1.90',
    severity: 'Medium'
  }
];

const SecurityLogsView: React.FC = () => {
  const [logs] = useState<SecurityLog[]>(INITIAL_LOGS);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'All' || log.event.includes(filter) || log.severity === filter;
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.actor.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400';
      case 'Medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'High': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Critical': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getEventIcon = (event: string) => {
    if (event.includes('Export')) return 'ios_share';
    if (event.includes('Access') || event.includes('Copy')) return 'visibility';
    if (event.includes('Security') || event.includes('Role')) return 'admin_panel_settings';
    if (event.includes('Download')) return 'download';
    return 'info';
  };

  const handleExportTrail = () => {
    const dataToExport = logs.map(log => ({
      'Timestamp': log.timestamp,
      'Actor Name': log.actor.name,
      'Actor Email': log.actor.email,
      'Event Type': log.event,
      'Details': log.details,
      'IP Address': log.ipAddress,
      'Risk Level': log.severity
    }));
    downloadAsCSV(dataToExport, `NOLT_Security_Trail_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Security & Compliance Logs</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Verifiable audit trail for regulatory compliance and internal security monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportTrail}
            className="px-6 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">file_download</span>
            Download Full Trail
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input 
              type="text" 
              placeholder="Search audit trail for specific actions..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-background-dark/50 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {['All', 'Export', 'Sensitive', 'Critical', 'Login'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === f 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-50 dark:bg-background-dark text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.1em] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Exact Timestamp</th>
                <th className="px-6 py-4">Performing Actor</th>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Granular Details</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-500">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={log.actor.avatar} className="w-8 h-8 rounded-lg" alt="" />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide group-hover:text-primary transition-colors">{log.actor.name}</p>
                        <p className="text-[10px] font-bold text-slate-500">{log.actor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        {getEventIcon(log.event)}
                      </span>
                      <span className="font-black text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-tight">{log.event}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm truncate text-xs font-bold leading-relaxed" title={log.details}>
                      {log.details}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-500 font-mono font-bold">{log.ipAddress}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getSeverityStyles(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogsView;
