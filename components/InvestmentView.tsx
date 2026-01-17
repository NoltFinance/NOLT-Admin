
import React, { useState, useEffect, useMemo } from 'react';
import { ReviewRequest, UserRole, RequestStatus, OperationLogEntry } from '../types';
import ExportFieldsModal from './ExportFieldsModal';
import ApprovalStepper from './ApprovalStepper';
import { flattenInvestment, downloadAsCSV } from '../utils/exportUtils';

interface InvestmentViewProps {
  requests: ReviewRequest[];
  onBack: () => void;
  selectedId?: string | null;
  onClearSelection?: () => void;
  currentUser: { name: string, role: UserRole, avatar: string };
}

const SALES_OFFICERS = [
  'Chidi Okoro',
  'Funke Akindele',
  'Emeka Okafor',
  'Blessing Udoh',
  'Alex Morgan',
  'Sarah Jenkins',
  'Michael Scott'
];

const INVESTMENT_EXPORT_CATEGORIES = [
  {
    title: 'Identity & Personal',
    fields: [
      { id: 'Reference ID', label: 'Reference ID' },
      { id: 'Title', label: 'Title' },
      { id: 'Full Name', label: 'Full Name' },
      { id: 'Email', label: 'Email' },
      { id: 'Is PEP', label: 'Is PEP' },
      { id: 'Gender', label: 'Gender' },
      { id: 'DOB', label: 'Date of Birth' },
    ]
  },
  {
    title: 'Investment Details',
    fields: [
      { id: 'Plan', label: 'Selected Plan' },
      { id: 'Amount', label: 'Principal Amount' },
      { id: 'Target Amount', label: 'Target Amount' },
      { id: 'Tenure', label: 'Tenure' },
      { id: 'Rollover Option', label: 'Rollover Option' },
      { id: 'Status', label: 'Application Status' },
      { id: 'Payment Status', label: 'Payment Status' },
    ]
  },
  {
    title: 'Verification & Address',
    fields: [
      { id: 'BVN', label: 'BVN' },
      { id: 'NIN', label: 'NIN' },
      { id: 'State of Origin', label: 'State of Origin' },
      { id: 'State of Residence', label: 'State of Residence' },
      { id: 'Home Address', label: 'Home Address' },
    ]
  }
];

const getApprovalNode = (status: RequestStatus) => {
  switch (status) {
    case 'Returned':
      return { id: 'Returned', label: 'Returned', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    case 'Pending Review':
      return { id: 'Submission', label: 'Submission', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Docs Verification':
      return { id: 'Validation', label: 'Customer Validation', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100' };
    case 'Internal Audit':
    case 'Pending Disbursement':
      return { id: 'PaymentVerification', label: 'Payment Verification', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100' };
    case 'Approved':
      return { id: 'Certificate', label: 'Investment Certificate', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' };
    case 'Declined':
      return { id: 'Rejected', label: 'Rejected', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100' };
    default:
      return { id: 'Processing', label: 'Processing', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/10 border-slate-100' };
  }
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Pending Review':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Docs Verification':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Internal Audit':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Pending Disbursement':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Returned':
    case 'Declined':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const InvestmentView: React.FC<InvestmentViewProps> = ({ requests, onBack, selectedId, onClearSelection, currentUser }) => {
  const [selectedInvestment, setSelectedInvestment] = useState<ReviewRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [nodeFilter, setNodeFilter] = useState('All Nodes');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineComment, setDeclineComment] = useState('');
  const [declineMode, setDeclineMode] = useState<'Decline' | 'Return'>('Decline');
  
  const [localOwnerName, setLocalOwnerName] = useState('');
  const [localSource, setLocalSource] = useState('REFERRED_LINK');

  const investmentRequests = useMemo(() => 
    requests.filter(req => req.type === 'Investment'),
    [requests]
  );

  useEffect(() => {
    if (selectedId) {
      const found = investmentRequests.find(r => r.id === selectedId);
      if (found) {
        setSelectedInvestment(found);
        setLocalOwnerName(found.ownerName || 'UNASSIGNED');
      }
    } else {
      setSelectedInvestment(null);
    }
  }, [selectedId, investmentRequests]);

  const filteredInvestments = useMemo(() => 
    investmentRequests.filter(req => {
      const matchesSearch = req.applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            req.referenceId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || req.status === statusFilter;
      const node = getApprovalNode(req.status);
      const matchesNode = nodeFilter === 'All Nodes' || node.label === nodeFilter;
      return matchesSearch && matchesStatus && matchesNode;
    }),
    [investmentRequests, searchTerm, statusFilter, nodeFilter]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvestments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvestments.map(req => req.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmExport = (selectedFields: string[]) => {
    // If specific rows are selected, only export those. Otherwise export all filtered.
    const targetDataset = selectedIds.size > 0 
      ? filteredInvestments.filter(req => selectedIds.has(req.id))
      : filteredInvestments;

    const dataToExport = targetDataset.map(req => {
      const flattened = flattenInvestment(req);
      const filtered: any = {};
      selectedFields.forEach(field => {
        filtered[field] = (flattened as any)[field];
      });
      return filtered;
    });

    downloadAsCSV(dataToExport, `NOLT_Investments_Export_${new Date().toISOString().split('T')[0]}`);
    setIsExportModalOpen(false);
  };

  const toggleVisibility = (label: string) => {
    const next = new Set(visibleFields);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setVisibleFields(next);
  };

  const handleSaveReassignment = () => {
    if (selectedInvestment) {
      const log: OperationLogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleString(),
        actor: currentUser.name,
        action: 'RE-ASSIGNED OWNER',
        comment: `Transferred ownership to ${localOwnerName}`
      };
      selectedInvestment.operationLogs = [log, ...(selectedInvestment.operationLogs || [])];
      selectedInvestment.ownerName = localOwnerName;
    }
    setLocalSource('RE-ASSIGNMENT');
    setIsReassigning(false);
  };

  const handleAuditPass = () => {
    if (selectedInvestment) {
      const log: OperationLogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleString(),
        actor: currentUser.name,
        action: 'AUDIT PASSED',
        comment: 'Compliance verified. Moving to Finance for payment verification.'
      };
      selectedInvestment.operationLogs = [log, ...(selectedInvestment.operationLogs || [])];
      selectedInvestment.status = 'Pending Disbursement';
      setSelectedInvestment({...selectedInvestment});
    }
  };

  const handleConfirmDisbursement = () => {
    if (selectedInvestment) {
      const log: OperationLogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleString(),
        actor: currentUser.name,
        action: 'PAYMENT VERIFIED',
        comment: 'Inbound fund receipt confirmed by Finance Team. Issuing certificate.'
      };
      selectedInvestment.operationLogs = [log, ...(selectedInvestment.operationLogs || [])];
      selectedInvestment.status = 'Approved';
      setSelectedInvestment({...selectedInvestment});
    }
  };

  const handleDeclineConfirm = () => {
    if (!declineComment.trim()) return;
    if (selectedInvestment) {
      const isReturn = declineMode === 'Return';
      const log: OperationLogEntry = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleString(),
        actor: currentUser.name,
        action: isReturn ? 'RETURNED TO PREVIOUS NODE' : 'DECLINED APPLICATION',
        comment: declineComment
      };
      selectedInvestment.operationLogs = [log, ...(selectedInvestment.operationLogs || [])];
      selectedInvestment.status = isReturn ? 'Returned' : 'Declined';
      setSelectedInvestment({...selectedInvestment});
    }
    setIsDeclineModalOpen(false);
    setDeclineComment('');
  };

  const handleDeclineTrigger = (mode: 'Decline' | 'Return') => {
    setDeclineMode(mode);
    setIsDeclineModalOpen(true);
  };

  const Field = ({ 
    label, 
    value, 
    mono = false, 
    isSensitive = false, 
    isEditable = false, 
    onEdit, 
    options,
    readOnly = false 
  }: { 
    label: string, 
    value?: any, 
    mono?: boolean, 
    isSensitive?: boolean, 
    isEditable?: boolean, 
    onEdit?: (val: string) => void, 
    options?: string[],
    readOnly?: boolean
  }) => {
    const isVisible = !isSensitive || visibleFields.has(label);
    const displayValue = isSensitive && !isVisible 
      ? '•••••••••••' 
      : (typeof value === 'boolean' ? (value ? 'YES' : 'NO') : (value || '—'));

    const shouldShowInput = !readOnly && !isSensitive && (isEditing || isEditable);

    return (
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2">
          {shouldShowInput ? (
             options ? (
               <select 
                className="text-xs bg-slate-50 dark:bg-background-dark/50 border border-primary/20 rounded px-2 py-1 w-full font-bold uppercase tracking-wide text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                value={value}
                onChange={(e) => onEdit?.(e.target.value)}
               >
                 {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
               </select>
             ) : (
               <input 
                className="text-xs bg-slate-50 dark:bg-background-dark/50 border border-primary/20 rounded px-2 py-1 w-full font-bold uppercase tracking-wide text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary" 
                value={value} 
                onChange={(e) => onEdit?.(e.target.value)}
              />
             )
          ) : (
            <p className={`text-sm font-black ${mono ? 'font-mono' : ''} ${label === 'Application Source' && value === 'RE-ASSIGNMENT' ? 'text-indigo-500 animate-pulse' : 'text-slate-900 dark:text-slate-100'} uppercase tracking-wide`}>
              {displayValue}
            </p>
          )}
          {isSensitive && (
            <button 
              onClick={() => toggleVisibility(label)}
              className="text-slate-400 hover:text-primary transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, children, icon, step, action }: { title: string, children?: React.ReactNode, icon: string, step?: number, action?: React.ReactNode }) => (
    <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px] font-black">{icon}</span>
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{title}</h5>
        </div>
        <div className="flex items-center gap-4">
          {action}
          {step !== undefined && <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">Step {step}</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const handleBackToList = () => {
    setSelectedInvestment(null);
    onClearSelection?.();
    setIsEditing(false);
    setIsReassigning(false);
  };

  if (selectedInvestment) {
    const inv = selectedInvestment;
    const app = inv.applicant;
    
    const isLocked = inv.status === 'Internal Audit' || inv.status === 'Pending Disbursement' || inv.status === 'Approved' || inv.status === 'Declined';
    const isFinalized = inv.status === 'Approved' || inv.status === 'Declined';

    const canEdit = (currentUser.role === 'Sales Officer' || currentUser.role === 'Sales Team Lead' || currentUser.role === 'Super Admin') && !isLocked;
    const canReassign = (currentUser.role === 'Sales Manager' || currentUser.role === 'Super Admin') && !isLocked;
    const canInternalAudit = currentUser.role === 'Internal Control' || currentUser.role === 'Super Admin';
    const canFinance = currentUser.role === 'Finance' || currentUser.role === 'Super Admin';
    const canApproveOrDecline = (currentUser.role === 'Super Admin' || currentUser.role === 'Sales Manager') && !isFinalized;
    const canVerify = (currentUser.role === 'Customer Experience' || currentUser.role === 'Super Admin' || currentUser.role === 'Sales Manager') && !isFinalized;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={handleBackToList}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-black text-xs uppercase tracking-[0.2em]"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Return to List
          </button>
          <div className="flex items-center gap-3">
            {inv.status === 'Approved' && (
               <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">verified</span>
                 Investment Active
               </span>
            )}
            {inv.status === 'Declined' && (
               <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                 <span className="material-symbols-outlined text-[18px]">cancel</span>
                 Application Rejected
               </span>
            )}
            {canEdit && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all ${isEditing ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-surface-dark text-primary border-primary/20 hover:bg-primary/5'}`}
              >
                {isEditing ? 'Save Changes' : 'Edit Details'}
              </button>
            )}
            {canReassign && (
              <button 
                onClick={() => isReassigning ? handleSaveReassignment() : setIsReassigning(true)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all ${isReassigning ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse' : 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20'}`}
              >
                {isReassigning ? 'Confirm New Owner' : 'Re-assign Owner'}
              </button>
            )}
            {isReassigning && (
              <button onClick={() => setIsReassigning(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500">Cancel</button>
            )}
            {canInternalAudit && inv.status === 'Internal Audit' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeclineTrigger('Return')}
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all"
                >
                  Return to Previous Node
                </button>
                <button 
                  onClick={handleAuditPass}
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all"
                >
                  Final Audit Pass
                </button>
              </div>
            )}
            {canFinance && inv.status === 'Pending Disbursement' && (
              <button 
                onClick={handleConfirmDisbursement}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-500/30 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Confirm Payment Verification
              </button>
            )}
            {canApproveOrDecline && (
              <button 
                onClick={() => handleDeclineTrigger('Decline')}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
              >
                Decline Application
              </button>
            )}
            {canVerify && currentUser.role !== 'Sales Manager' && (
              <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-primary rounded-xl hover:bg-blue-600 shadow-xl shadow-primary/30 transition-all">Verify & Approve</button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm py-4 mb-8">
           <ApprovalStepper status={inv.status} type="Investment" />
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <img src={app.avatar} className="w-24 h-24 rounded-[28px] border-4 border-slate-50 dark:border-slate-800 shadow-xl" alt="" />
            {app.isPep && <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full border-2 border-white dark:border-surface-dark">PEP</div>}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{app.title} {app.name}</h3>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{inv.referenceId} • {app.email}</p>
          </div>
          <div className="bg-slate-50 dark:bg-background-dark/50 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 text-center md:text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Principal</p>
            <p className="text-3xl font-black text-primary tracking-tight">{inv.amount}</p>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Internal Audit & Tracking" icon="fingerprint" step={0}>
            <Field label="Linked Sales Officer" value={localOwnerName} isEditable={isReassigning} onEdit={setLocalOwnerName} options={SALES_OFFICERS} />
            <Field label="Referral Code Used" value={inv.referralCodeUsed} mono readOnly />
            <Field label="Application Source" value={localSource} readOnly />
          </Section>

          {/* Operation Log Section */}
          <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px] font-black">history</span>
                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Operation Log</h5>
              </div>
            </div>
            <div className="space-y-4">
              {inv.operationLogs && inv.operationLogs.length > 0 ? (
                inv.operationLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 dark:bg-background-dark/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{log.action}</span>
                        <span className="text-[10px] font-bold text-slate-400">• {log.timestamp}</span>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">{log.actor}</p>
                      {log.comment && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">"{log.comment}"</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <span className="material-symbols-outlined text-4xl opacity-20">history_edu</span>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2">No activity logged yet</p>
                </div>
              )}
            </div>
          </div>

          <Section title="Plan Selection" icon="layers" step={1}>
            <Field label="Selected Plan" value={inv.selectedPlan} />
          </Section>

          <Section title="Identity Basics" icon="badge" step={2}>
            <Field label="Title" value={app.title} />
            <Field label="Full Name" value={app.name} />
            <Field label="PEP Status" value={app.isPep ? 'INDICATED' : 'NONE'} />
          </Section>

          <Section title="Personal Details" icon="person" step={3}>
            <Field label="Gender" value={app.gender} />
            <Field label="Date of Birth" value={app.dateOfBirth} />
          </Section>

          <Section title="Further Details" icon="info" step={4}>
            <Field label="Mother's Maiden Name" value={app.mothersMaidenName} />
            <Field label="Religion" value={app.religion} />
            <Field label="Marital Status" value={app.maritalStatus} />
          </Section>

          <Section title="Contact Information" icon="call" step={5}>
            <Field label="Country Code" value={app.countryCode} />
            <Field label="Mobile Number" value={app.phone} />
            <Field label="Email Address" value={app.email} />
          </Section>

          <Section title="Verification" icon="verified" step={6}>
            <Field label="BVN" value={app.bvn} isSensitive />
            <Field label="NIN" value={app.nin} isSensitive />
          </Section>

          <Section title="Address Details" icon="location_on" step={7}>
            <Field label="State of Origin" value={app.stateOfOrigin} />
            <Field label="State of Residence" value={app.stateOfResidence} />
            <Field label="Home Address" value={app.address} />
          </Section>

          <Section title="Next of Kin" icon="family_history" step={8}>
            <Field label="NOK Full Name" value={app.nokName} />
            <Field label="NOK Relationship" value={app.nokRelationship} />
            <Field label="NOK Address" value={app.nokAddress} />
          </Section>

          <Section 
            title="Secure Vault" 
            icon="lock" 
            step={9}
            action={
              <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/20">
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                Upload New Document
              </button>
            }
          >
             <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Government ID</p>
                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                  {inv.governmentIdUrl ? <img src={inv.governmentIdUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined opacity-20 text-4xl">badge</span>}
                  <button className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                     <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                     <span className="text-[10px] font-black uppercase tracking-widest">Update Document</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof of Address</p>
                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                  {inv.proofOfAddressUrl ? <img src={inv.proofOfAddressUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined opacity-20 text-4xl">home_pin</span>}
                  <button className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                     <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                     <span className="text-[10px] font-black uppercase tracking-widest">Update Document</span>
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Investment Configuration" icon="tune" step={10}>
            <Field label="Investment Amount" value={inv.amount} />
            <Field label="Target Amount" value={inv.targetAmount} />
            <Field label="Rollover Option" value={inv.rolloverOption} />
            <Field label="Tenure" value={inv.tenure} />
          </Section>

          <Section title="Payment Verification" icon="account_balance_wallet" step={11}>
            <Field label="Payment Status" value={inv.paymentStatus} />
            <div className="col-span-full pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transfer Receipt</p>
                <button className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-black text-[8px] uppercase tracking-widest hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-[14px]">file_upload</span>
                  Replace Receipt
                </button>
              </div>
              <div className="max-w-md aspect-[3/4] bg-slate-100 dark:bg-surface-dark rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative group">
                {inv.transferReceiptUrl ? <img src={inv.transferReceiptUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined opacity-20 text-4xl">receipt_long</span>}
                <button className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Update Receipt</span>
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* Action Modal (Decline/Return) */}
        {isDeclineModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {declineMode === 'Decline' ? 'Decline Application' : 'Return to Previous Node'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 font-bold">
                    {declineMode === 'Decline' 
                      ? 'Provide a reason for rejecting this investment.' 
                      : 'State what needs to be corrected by the previous team.'}
                  </p>
                </div>
                <button onClick={() => setIsDeclineModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision Comment</label>
                  <textarea 
                    value={declineComment}
                    onChange={(e) => setDeclineComment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white placeholder:text-slate-400" 
                    placeholder="Enter your specific reasons or correction instructions..."
                    rows={4}
                  />
                  {!declineComment.trim() && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">A comment is required to proceed.</p>}
                </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setIsDeclineModalOpen(false)} className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest">Discard</button>
                <button 
                  onClick={handleDeclineConfirm}
                  disabled={!declineComment.trim()}
                  className={`px-8 py-4 text-white text-[10px] font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 ${declineMode === 'Decline' ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-600' : 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600'}`}
                >
                  Confirm {declineMode}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Investments</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Comprehensive tracking of all investment applications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="px-6 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
            {selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export Dataset'}
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
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
            <option>Payment Verification</option>
            <option>Investment Certificate</option>
            <option>Returned</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 dark:bg-slate-700 text-primary focus:ring-primary cursor-pointer transition-all"
                    checked={filteredInvestments.length > 0 && selectedIds.size === filteredInvestments.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-5">Applicant</th>
                <th className="px-6 py-5">Reference ID</th>
                <th className="px-6 py-5">Plan</th>
                <th className="px-6 py-5">Current Node</th>
                <th className="px-6 py-5">Sales Officer</th>
                <th className="px-6 py-5">Principal</th>
                <th className="px-6 py-5">Tenure</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvestments.map((req) => {
                const node = getApprovalNode(req.status);
                const isChecked = selectedIds.has(req.id);
                return (
                  <tr 
                    key={req.id} 
                    onClick={() => setSelectedInvestment(req)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group ${isChecked ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 dark:bg-slate-700 text-primary focus:ring-primary cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleSelectRow(req.id)}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <img src={req.applicant.avatar} className="w-10 h-10 rounded-xl" alt="" />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide group-hover:text-primary transition-colors">{req.applicant.name}</p>
                          <p className="text-[10px] font-bold text-slate-500">{req.applicant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500">{req.referenceId}</td>
                    <td className="px-6 py-5"><span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase rounded-lg border border-purple-200 dark:border-purple-800">{req.selectedPlan}</span></td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${node.color}`}>
                        {node.label}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{req.ownerName}</span>
                        <span className="text-[9px] font-mono font-bold text-primary">{req.referralCodeUsed}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-black text-slate-900 dark:text-white">{req.amount}</td>
                    <td className="px-6 py-5 font-bold text-slate-500">{req.tenure}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-all">chevron_right</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ExportFieldsModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onConfirm={handleConfirmExport} 
        categories={INVESTMENT_EXPORT_CATEGORIES} 
      />
    </div>
  );
};

export default InvestmentView;
