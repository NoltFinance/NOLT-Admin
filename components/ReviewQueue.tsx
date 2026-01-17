
import React from 'react';
import { ReviewRequest, RequestStatus } from '../types';

interface ReviewQueueProps {
  requests: ReviewRequest[];
  onViewAll?: () => void;
  onSelectRequest?: (req: ReviewRequest) => void;
}

const getApprovalNode = (request: ReviewRequest) => {
  const { status, type } = request;
  const isLoan = type === 'Loan';

  switch (status) {
    case 'Returned':
      return { label: 'Returned', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    case 'Pending Review':
      return { label: 'Submission', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Docs Verification':
      return { label: 'Validation', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Internal Audit':
      return { 
        label: isLoan ? 'Credit Check' : 'Payment Verification', 
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' 
      };
    case 'Pending Disbursement':
      return { 
        label: isLoan ? 'Request For Payment' : 'Payment Verification', 
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' 
      };
    case 'Approved':
      return { 
        label: isLoan ? 'Disbursed' : 'Investment Certificate', 
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' 
      };
    case 'Declined':
      return { label: 'Rejected', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    default:
      return { label: 'Processing', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/10 border-slate-100' };
  }
};

const ReviewQueue: React.FC<ReviewQueueProps> = ({ requests, onViewAll, onSelectRequest }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Pending Review':
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'Docs Verification':
        return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
      case 'Approved':
        return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'Returned':
        return 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50';
      case 'Declined':
        return 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50';
      default:
        return 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Investment':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30';
      default:
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Review Queue</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Incoming loan and investment requests awaiting approval.</p>
        </div>
        <button 
          onClick={onViewAll}
          className="px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl bg-primary text-white hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 self-start sm:self-auto"
        >
          View All Queue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 w-10 text-center">
                <input className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary dark:bg-slate-800" type="checkbox"/>
              </th>
              <th className="px-6 py-4">Reference ID</th>
              <th className="px-6 py-4">Applicant</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Node</th>
              <th className="px-6 py-4">Sales Officer</th>
              <th className="px-6 py-4">Ref. Code</th>
              <th className="px-6 py-4">Requested Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((request) => {
              const node = getApprovalNode(request);
              return (
                <tr 
                  key={request.id} 
                  onClick={() => onSelectRequest?.(request)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary dark:bg-slate-800" type="checkbox"/>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] font-bold">{request.referenceId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={request.applicant.avatar} 
                        alt={request.applicant.name}
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                      />
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide group-hover:text-primary transition-colors">{request.applicant.name}</span>
                        <span className="text-[10px] font-bold text-slate-500">{request.applicant.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getTypeStyles(request.type)}`}>
                      {request.type}
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
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{request.ownerName || 'UNASSIGNED'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-primary">{request.referralCodeUsed || 'N/A'}</code>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white tracking-wide">{request.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(request.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewQueue;
