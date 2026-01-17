
import React from 'react';
import { RequestStatus, RequestType } from '../types';

interface ApprovalStepperProps {
  status: RequestStatus;
  type: RequestType;
}

const LOAN_STAGES = [
  { id: 'submission', label: 'Submission', icon: 'send' },
  { id: 'validation', label: 'Customer Validation', icon: 'person_check' },
  { id: 'credit', label: 'Credit Check', icon: 'analytics' },
  { id: 'payment', label: 'Request For Payment', icon: 'account_balance_wallet' },
  { id: 'disbursed', label: 'Disbursed', icon: 'check_circle' },
];

const INVESTMENT_STAGES = [
  { id: 'submission', label: 'Submission', icon: 'send' },
  { id: 'validation', label: 'Customer Validation', icon: 'person_check' },
  { id: 'payment_v', label: 'Payment Verification', icon: 'account_balance_wallet' },
  { id: 'certificate', label: 'Issue Investment Certificate', icon: 'verified' },
];

const ApprovalStepper: React.FC<ApprovalStepperProps> = ({ status, type }) => {
  const isLoan = type === 'Loan';
  const stages = isLoan ? LOAN_STAGES : INVESTMENT_STAGES;

  const getActiveIndex = () => {
    if (isLoan) {
      switch (status) {
        case 'Pending Review': return 0;
        case 'Docs Verification': return 1;
        case 'Internal Audit': return 2; 
        case 'Pending Disbursement': return 3; 
        case 'Approved': return 4;      
        case 'Returned': return 0;      
        case 'Declined': return -1;
        default: return 0;
      }
    } else {
      // Investment Flow (4 Steps)
      switch (status) {
        case 'Pending Review': return 0;
        case 'Docs Verification': return 1;
        case 'Internal Audit': 
        case 'Pending Disbursement': return 2; 
        case 'Approved': return 3;      
        case 'Returned': return 0;      
        case 'Declined': return -1;
        default: return 0;
      }
    }
  };

  const activeIndex = getActiveIndex();
  const isDeclined = status === 'Declined';

  return (
    <div className="w-full py-8 px-4">
      <div className="relative flex items-center justify-between max-w-5xl mx-auto">
        {/* Progress Line Background */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700 ease-in-out" 
          style={{ width: `${Math.max(0, (activeIndex / (stages.length - 1)) * 100)}%` }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < activeIndex || (activeIndex === stages.length - 1);
          const isActive = idx === activeIndex;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${
                  isCompleted 
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' 
                    : isActive 
                    ? 'bg-white dark:bg-surface-dark text-primary border-primary shadow-xl scale-110' 
                    : 'bg-white dark:bg-surface-dark text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'animate-pulse font-black' : ''}`}>
                  {isDeclined && isActive ? 'block' : stage.icon}
                </span>
              </div>
              <div className="absolute top-14 whitespace-nowrap text-center">
                <p className={`text-[10px] font-black uppercase tracking-widest ${
                  isCompleted || isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                }`}>
                  {stage.label}
                </p>
                {isActive && (
                  <span className="text-[8px] font-bold text-primary uppercase tracking-tighter block mt-0.5">
                    {isDeclined ? 'Terminated' : 'Current Phase'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalStepper;
