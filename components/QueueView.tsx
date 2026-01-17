
import React, { useState, useMemo } from 'react';
import { ReviewRequest, RequestStatus } from '../types';

interface QueueViewProps {
  requests: ReviewRequest[];
  onBack: () => void;
  onSelectRequest: (req: ReviewRequest) => void;
}

const getApprovalNode = (request: ReviewRequest) => {
  const { status, type } = request;
  const isLoan = type === 'Loan';

  switch (status) {
    case 'Returned':
      return { id: 'Returned', label: 'Returned', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    case 'Pending Review':
      return { id: 'Submission', label: 'Submission', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Docs Verification':
      return { id: 'Validation', label: 'Customer Validation', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Internal Audit':
      return { 
        id: isLoan ? 'CreditCheck' : 'PaymentVerification', 
        label: isLoan ? 'Credit Check' : 'Payment Verification', 
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' 
      };
    case 'Pending Disbursement':
      return { 
        id: isLoan ? 'PaymentReq' : 'PaymentVerification', 
        label: isLoan ? 'Request For Payment' : 'Payment Verification', 
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' 
      };
    case 'Approved':
      return { 
        id: isLoan ? 'Disbursed' : 'Certificate', 
        label: isLoan ? 'Disbursed' : 'Investment Certificate', 
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' 
      };
    case 'Declined':
      return { id: 'Rejected', label: 'Rejected', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    default:
      return { id: 'Processing', label: 'Processing', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/10 border-slate-100' };
  }
};

const QueueView: React.FC<QueueViewProps> = ({ requests, onBack, onSelectRequest }) => {
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [nodeFilter, setNodeFilter] = useState('All Nodes');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = useMemo(() => 
    requests.filter(req => {
      const matchesSearch = req.applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            req.referenceId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || req.status === statusFilter;
      const node = getApprovalNode(req);
      const matchesNode = nodeFilter === 'All Nodes' || node.label === nodeFilter;
      return matchesSearch && matchesStatus && matchesNode;
    }),
    [requests, searchTerm, statusFilter, nodeFilter]
  );

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-500';
      case 'Docs Verification': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-500';
      case 'Approved': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500';
      case 'Returned': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-500';
      case 'Declined': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-500';
      default: return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-500';
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Investment': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30';
      default: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Dashboard
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-900 dark:text-white font-black uppercase tracking-wider text-xs">Review Queue</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Full Review Queue</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold">Manage all incoming financial applications and their current processing stage.</p>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input 
            type="text" 
            placeholder="Search by ID or name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary text-sm font-black transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary w-full md:w-auto"
          >
            <option>All Status</option>
            <option>Pending Review</option>
            <option>Docs Verification</option>
            <option>Internal Audit</option>
            <option>Pending Disbursement</option>
            <option>Approved</option>
            <option>Declined</option>
            <option>Returned</option>
          </select>
          <select 
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary w-full md:w-auto"
          >
            <option>All Nodes</option>
            <option>Submission</option>
            <option>Customer Validation</option>
            <option>Credit Check</option>
            <option>Payment Verification</option>
            <option>Request For Payment</option>
            <option>Disbursed</option>
            <option>Investment Certificate</option>
            <option>Returned</option>
          </select>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Reference ID</th>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Node</th>
                <th className="px-6 py-4">Sales Officer</th>
                <th className="px-6 py-4">Ref. Code</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.map((req) => {
                const node = getApprovalNode(req);
                return (
                  <tr 
                    key={req.id} 
                    onClick={() => onSelectRequest(req)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{req.referenceId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={req.applicant.avatar} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="" />
                          {req.applicant.isPep && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-surface-dark rounded-full" title="PEP Detected"></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide group-hover:text-primary transition-colors">{req.applicant.name}</p>
                            {req.applicant.isPep && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-900/60 uppercase tracking-tighter">PEP</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-500">{req.applicant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getTypeStyles(req.type)}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${node.color}`}>
                        {node.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">person_outline</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{req.ownerName || 'UNASSIGNED'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-primary">{req.referralCodeUsed || 'N/A'}</code>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white tracking-wide">{req.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(req.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QueueView;
