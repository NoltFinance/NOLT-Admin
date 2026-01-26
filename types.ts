export type RequestType = "Investment" | "Loan";
export type RequestStatus =
  | "Pending Review"
  | "Docs Verification"
  | "Approved"
  | "Declined"
  | "Returned"
  | "Internal Audit"
  | "Pending Disbursement";
export type AppView =
  | "dashboard"
  | "queue"
  | "investments"
  | "loans"
  | "reports"
  | "settings"
  | "users"
  | "security"
  | "form-builder"
  | "assigned-forms";

export type UserRole =
  | "Super Admin"
  | "Credit"
  | "Sales Manager"
  | "Sales Team Lead"
  | "Sales Officer"
  | "Customer Experience"
  | "Internal Control"
  | "Finance";

export type UserStatus = "Active" | "Pending" | "Suspended" | "Deleted";

export interface AppNotification {
  id: string;
  type: "loan" | "investment" | "security" | "system";
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
  severity: "Low" | "Medium" | "High" | "Critical";
}

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  comment?: string;
  fromStatus?: string;
  toStatus?: string;
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
  selectedPlan?: "NOLT Rise" | "NOLT Vault";
  targetAmount?: string;
  rolloverOption?: "Principal & Interest" | "Principal Only" | "Payout";
  tenure?: string;

  // Loan Specific Fields
  loanCategory?: "Business" | "Employees" | "Niche";
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

  paymentStatus?: "PENDING_PAYMENT" | "PAID" | "VERIFIED";
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

// Form Builder Types
export type FormFieldType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "time"
  | "file"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "checkbox"
  | "checkbox_group"
  | "radio"
  | "toggle"
  | "rating"
  | "slider"
  | "color"
  | "signature"
  | "location";
export type FormStatus = "Draft" | "Published" | "Archived";
export type FormVisibility = "Public" | "Internal" | "Private";

export interface FormField {
  id: string;
  form_id: string;
  field_type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[] | Record<string, any>;
  validation_rules?: Record<string, any>;
  order_index: number;
  step_number?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomForm {
  id: string;
  name: string;
  type: RequestType;
  category_type?: string;
  status: FormStatus;
  visibility: FormVisibility;
  description?: string;
  administrators?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  version: number;
  enable_steps?: boolean;
  step_labels?: string[];
  fields?: FormField[];
}

export interface FormSubmission {
  id: string;
  form_id: string;
  applicant_email: string;
  applicant_name: string;
  field_responses: Record<string, any>;
  status: "Submitted" | "Under Review" | "Approved" | "Rejected";
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}
