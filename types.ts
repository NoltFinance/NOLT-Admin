
export type RequestType = 'Investment' | 'Loan';
export type RequestStatus = 'Pending Review' | 'Docs Verification' | 'Approved' | 'Declined' | 'Returned' | 'Internal Audit' | 'Pending Disbursement';
export type AppView = 'dashboard' | 'queue' | 'investments' | 'loans' | 'reports' | 'settings' | 'users' | 'security' | 'form-builder';

export type UserRole = 
  | 'Super Admin' 
  | 'Credit' 
  | 'Sales Manager' 
  | 'Sales Team Lead'
  | 'Sales Officer' 
  | 'Customer Experience'
  | 'Internal Control'
  | 'Finance';

export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface AppNotification {
  id: string;
  type: 'loan' | 'investment' | 'security' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  referenceId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  referralCode?: string;
  lastActive: string;
  avatar: string;
  teamLeadId?: string; // ID of the Team Lead overseeing this user
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    avatar: string;
  };
  event: string;
  details: string;
  ipAddress: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  comment?: string;
}

export interface Reference {
  name: string;
  phone: string;
  relationship: string;
}

export interface Applicant {
  title?: string;
  name: string;
  email: string;
  avatar: string;
  isPep?: boolean;
  gender?: string;
  dateOfBirth?: string;
  mothersMaidenName?: string;
  religion?: string;
  maritalStatus?: string;
  countryCode?: string;
  phone?: string;
  bvn?: string;
  nin?: string;
  stateOfOrigin?: string;
  stateOfResidence?: string;
  address?: string;
  occupation?: string;
  nokName?: string;
  nokRelationship?: string;
  nokAddress?: string;
  
  // Loan specific applicant details
  residentialStatus?: string;
  dependents?: number;
  
  // IPPIS specific details
  ippisNumber?: string;
  mda?: string;
}

export interface ReviewRequest {
  id: string;
  referenceId: string;
  applicant: Applicant;
  type: RequestType;
  amount: string;
  eligibleAmount?: string; // Added for Credit node
  dateSubmitted: string;
  status: RequestStatus;
  ownerId?: string; 
  ownerName?: string; 
  referralCodeUsed?: string;
  operationLogs?: OperationLogEntry[];
  
  // Investment Specific Fields
  selectedPlan?: 'NOLT Rise' | 'NOLT Vault';
  targetAmount?: string;
  rolloverOption?: 'Principal & Interest' | 'Principal Only' | 'Payout';
  tenure?: string;
  
  // Loan Specific Fields
  loanCategory?: 'Business' | 'Employees' | 'Niche';
  loanProduct?: string;
  hasActiveLoans?: boolean;
  monthlyIncome?: string;
  repaymentPeriod?: string;
  references?: Reference[];
  
  // Document URLs
  governmentIdUrl?: string;
  proofOfAddressUrl?: string;
  transferReceiptUrl?: string;
  bankStatementUrl?: string;
  selfieUrl?: string;
  
  paymentStatus?: 'PENDING_PAYMENT' | 'PAID' | 'VERIFIED';
}

export interface StatMetric {
  label: string;
  value: string;
  subValue?: string;
  change?: string;
  isPositive?: boolean;
  icon: string;
  color: string;
  badgeText?: string;
}
