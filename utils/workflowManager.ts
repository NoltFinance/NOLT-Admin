import { UserRole, RequestStatus, RequestType } from "../types";
import { getApprovalGates, ApprovalGate } from "../services/approvalGatesService";

/**
 * NOLT Finance - Approval Workflow Manager
 *
 * This module implements the sequential approval workflow as defined in the
 * Application Process & Approval Workflow document.
 * 
 * Workflow gates are now loaded from Supabase database.
 */

// Cache for workflow gates
let cachedGates: ApprovalGate[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load approval gates from Supabase with caching
 */
async function loadApprovalGates(): Promise<ApprovalGate[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedGates && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedGates;
  }

  try {
    const { data, error } = await getApprovalGates();
    
    if (error || !data) {
      console.error("Error loading approval gates:", error);
      // Return empty array on error, fallback will handle it
      return cachedGates || [];
    }

    cachedGates = data;
    cacheTimestamp = now;
    return data;
  } catch (err) {
    console.error("Unexpected error loading gates:", err);
    return cachedGates || [];
  }
}

/**
 * Clear the gates cache (useful after updates)
 */
export function clearGatesCache(): void {
  cachedGates = null;
  cacheTimestamp = null;
}

/**
 * Convert ApprovalGate to WorkflowStage format
 */
function convertGateToStage(gate: ApprovalGate, workflow: ApprovalGate[]): WorkflowStage {
  // Determine next stages based on order
  const currentIndex = workflow.findIndex(g => g.id === gate.id);
  const nextGate = workflow.find(g => 
    g.workflow_type === gate.workflow_type && 
    g.order === gate.order + 1
  );

  return {
    id: gate.id,
    label: gate.name,
    status: mapOrderToStatus(gate.order, gate.workflow_type),
    description: gate.description,
    gateKeepers: gate.gatekeepers,
    requiredActions: gate.required_actions,
    nextStageOn: {
      approve: nextGate?.id || gate.id,
      decline: "declined",
      return: currentIndex > 0 ? workflow[currentIndex - 1]?.id || "returned" : "returned",
    },
  };
}

/**
 * Map gate order to RequestStatus
 */
function mapOrderToStatus(order: number, workflowType: string): RequestStatus {
  if (workflowType === "Loan" || workflowType === "Both") {
    switch (order) {
      case 1: return "Pending Review";
      case 2: return "Docs Verification";
      case 3: return "Internal Audit";
      case 4: return "Pending Disbursement";
      case 5: return "Approved";
      default: return "Pending Review";
    }
  } else { // Investment
    switch (order) {
      case 1: return "Pending Review";
      case 2: return "Docs Verification";
      case 3: return "Pending Disbursement";
      case 4: return "Approved";
      default: return "Pending Review";
    }
  }
}

/**
 * Get workflow stages for a specific type from database
 */
async function getWorkflowFromDatabase(applicationType: RequestType): Promise<WorkflowStage[]> {
  const gates = await loadApprovalGates();
  
  // Filter gates by workflow type
  const relevantGates = gates
    .filter(gate => 
      gate.workflow_type === applicationType || gate.workflow_type === "Both"
    )
    .sort((a, b) => a.order - b.order);

  return relevantGates.map(gate => convertGateToStage(gate, relevantGates));
}

// ============================================================================
// WORKFLOW STAGE DEFINITIONS (FALLBACK - kept for backward compatibility)
// ============================================================================

export interface WorkflowStage {
  id: string;
  label: string;
  status: RequestStatus;
  description: string;
  gateKeepers: UserRole[]; // Roles that can approve at this stage
  requiredActions?: string[]; // Actions that must be completed
  nextStageOn: {
    approve: string;
    decline: string;
    return?: string;
  };
}

/**
 * Loan Application Flow (FALLBACK - prefer database)
 */
export const LOAN_WORKFLOW: WorkflowStage[] = [
  {
    id: "submission",
    label: "Submission",
    status: "Pending Review",
    description:
      "Sales Staff gathers requirements. For IPPIS products, IPPIS Number and MDA are mandatory.",
    gateKeepers: ["Sales Manager", "Sales Officer", "Super Admin"],
    nextStageOn: {
      approve: "customer_validation",
      decline: "declined",
      return: "returned",
    },
  },
  {
    id: "customer_validation",
    label: "Customer Validation",
    status: "Docs Verification",
    description: "CX verifies ID and address documents.",
    gateKeepers: ["Customer Experience", "Super Admin"],
    nextStageOn: {
      approve: "credit_check",
      decline: "declined",
      return: "submission",
    },
  },
  {
    id: "credit_check",
    label: "Credit Check",
    status: "Internal Audit",
    description:
      "Credit role performs risk assessment and determines Eligible Amount.",
    gateKeepers: ["Credit", "Super Admin"],
    requiredActions: ["Eligible Amount must be supplied before proceeding"],
    nextStageOn: {
      approve: "request_for_payment",
      decline: "declined",
      return: "customer_validation",
    },
  },
  {
    id: "request_for_payment",
    label: "Request For Payment",
    status: "Pending Disbursement",
    description:
      "Internal Control audits, Finance reviews payout instructions.",
    gateKeepers: ["Internal Control", "Finance", "Super Admin"],
    nextStageOn: {
      approve: "disbursed",
      decline: "declined",
      return: "credit_check",
    },
  },
  {
    id: "disbursed",
    label: "Disbursed",
    status: "Approved",
    description: "Final confirmation of fund transfer.",
    gateKeepers: ["Finance", "Super Admin"],
    nextStageOn: {
      approve: "disbursed",
      decline: "disbursed",
    },
  },
];

/**
 * Investment Application Flow (4 Stages)
 * 1. Submission → 2. Customer Validation → 3. Payment Verification → 4. Issue Investment Certificate
 */
export const INVESTMENT_WORKFLOW: WorkflowStage[] = [
  {
    id: "submission",
    label: "Submission",
    status: "Pending Review",
    description: "Lead capture and principal selection.",
    gateKeepers: ["Sales Manager", "Sales Officer", "Super Admin"],
    nextStageOn: {
      approve: "customer_validation",
      decline: "declined",
      return: "returned",
    },
  },
  {
    id: "customer_validation",
    label: "Customer Validation",
    status: "Docs Verification",
    description: "CX verifies identity and rollover preferences.",
    gateKeepers: ["Customer Experience", "Super Admin"],
    nextStageOn: {
      approve: "payment_verification",
      decline: "declined",
      return: "submission",
    },
  },
  {
    id: "payment_verification",
    label: "Payment Verification",
    status: "Pending Disbursement",
    description: "Finance confirms actual receipt of investment principal.",
    gateKeepers: ["Finance", "Internal Control", "Super Admin"],
    nextStageOn: {
      approve: "certificate_issued",
      decline: "declined",
      return: "customer_validation",
    },
  },
  {
    id: "certificate_issued",
    label: "Investment Certificate",
    status: "Approved",
    description: "Legal investment document generated and dispatched.",
    gateKeepers: ["Finance", "Super Admin"],
    nextStageOn: {
      approve: "certificate_issued",
      decline: "certificate_issued",
    },
  },
];

// ============================================================================
// ROLE-BASED ACCESS CONTROL FOR WORKFLOWS
// ============================================================================

/**
 * Visibility scope based on role
 */
export function canViewApplication(
  userRole: UserRole,
  applicationType: RequestType,
  applicationOwnerId?: string,
  userId?: string,
): boolean {
  // Super Admin: Global access
  if (userRole === "Super Admin") return true;

  // Sales Manager: Global access
  if (userRole === "Sales Manager") return true;

  // Customer Experience: Global access
  if (userRole === "Customer Experience") return true;

  // Internal Control: Global access
  if (userRole === "Internal Control") return true;

  // Finance: Global access (Audit Passed Only - enforced at query level)
  if (userRole === "Finance") return true;

  // Credit: Loan Records only (Post-CX)
  if (userRole === "Credit") {
    return applicationType === "Loan";
  }

  // Sales Staff/Officer: Ownership-based
  if (userRole === "Sales Officer" || userRole === "Sales Team Lead") {
    return applicationOwnerId === userId;
  }

  return false;
}

/**
 * Get current workflow stage details (from database)
 */
export async function getCurrentStage(
  status: RequestStatus,
  applicationType: RequestType,
): Promise<WorkflowStage | null> {
  const workflow = await getWorkflowFromDatabase(applicationType);
  return workflow.find((stage) => stage.status === status) || null;
}

/**
 * Get all stages for a workflow type (from database)
 */
export async function getWorkflowStages(
  applicationType: RequestType,
): Promise<WorkflowStage[]> {
  return getWorkflowFromDatabase(applicationType);
}

/**
 * Check if user can perform action at current stage (from database)
 */
export async function canPerformAction(
  userRole: UserRole,
  currentStatus: RequestStatus,
  applicationType: RequestType,
  action: "approve" | "decline" | "return" | "edit",
): Promise<boolean> {
  const currentStage = await getCurrentStage(currentStatus, applicationType);

  if (!currentStage) return false;

  // Super Admin can override any gate
  if (userRole === "Super Admin") return true;

  // Check if role is a gatekeeper for this stage
  if (action === "approve" || action === "decline") {
    return currentStage.gateKeepers.includes(userRole);
  }

  // Return action available to gatekeepers and Sales Manager
  if (action === "return") {
    return (
      currentStage.gateKeepers.includes(userRole) ||
      userRole === "Sales Manager"
    );
  }

  // Edit action for Sales roles on Pending Review or Returned
  if (action === "edit") {
    return (
      (userRole === "Sales Officer" ||
        userRole === "Sales Team Lead" ||
        userRole === "Sales Manager") &&
      (currentStatus === "Pending Review" || currentStatus === "Returned")
    );
  }

  return false;
}

/**
 * Get next status based on action (from database)
 */
export async function getNextStatus(
  currentStatus: RequestStatus,
  applicationType: RequestType,
  action: "approve" | "decline" | "return",
): Promise<RequestStatus> {
  const currentStage = await getCurrentStage(currentStatus, applicationType);

  if (!currentStage) return currentStatus;

  if (action === "decline") return "Declined";
  if (action === "return") return "Returned";

  const nextStageId = currentStage.nextStageOn[action];
  const workflow = await getWorkflowFromDatabase(applicationType);
  const nextStage = workflow.find((stage) => stage.id === nextStageId);
  
  return nextStage?.status || currentStatus;
}

/**
 * Get available actions for user at current stage (from database)
 */
export async function getAvailableActions(
  userRole: UserRole,
  currentStatus: RequestStatus,
  applicationType: RequestType,
  eligibleAmount?: string,
): Promise<string[]> {
  const actions: string[] = [];

  // Check if Credit Check and eligible amount not set
  if (
    applicationType === "Loan" &&
    currentStatus === "Internal Audit" &&
    userRole === "Credit" &&
    !canProceedFromCreditCheck(eligibleAmount)
  ) {
    return ["set_eligible_amount"];
  }

  if (await canPerformAction(userRole, currentStatus, applicationType, "approve")) {
    actions.push("approve");
  }

  if (await canPerformAction(userRole, currentStatus, applicationType, "decline")) {
    actions.push("decline");
  }

  if (await canPerformAction(userRole, currentStatus, applicationType, "return")) {
    actions.push("return");
  }

  if (await canPerformAction(userRole, currentStatus, applicationType, "edit")) {
    actions.push("edit");
  }

  // Reassign action for Sales Manager
  if (userRole === "Sales Manager" || userRole === "Super Admin") {
    actions.push("reassign");
  }

  return actions;
}

/**
 * Get approval gate number (for display) (from database)
 */
export async function getApprovalGateNumber(
  status: RequestStatus,
  applicationType: RequestType,
): Promise<string> {
  const stage = await getCurrentStage(status, applicationType);
  if (!stage) return "";

  const workflow = await getWorkflowStages(applicationType);
  const index = workflow.findIndex((s) => s.id === stage.id);

  if (index === -1) return "";

  return `Gate ${index + 1}`;
}

/**
 * Validate if Credit Check can proceed (Eligible Amount required)
 */
export function canProceedFromCreditCheck(eligibleAmount?: string): boolean {
  return !!(
    eligibleAmount &&
    eligibleAmount.trim() !== "" &&
    parseFloat(eligibleAmount.replace(/[^0-9.]/g, "")) > 0
  );
}

/**
 * Status badge styling helper
 */
export function getStatusBadgeStyle(status: RequestStatus): string {
  const styles: Record<RequestStatus, string> = {
    "Pending Review":
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
    "Docs Verification":
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400",
    "Internal Audit":
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",
    "Pending Disbursement":
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    Approved:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
    Declined:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400",
    Returned:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
  };
  return styles[status] || "bg-slate-100 text-slate-700 border-slate-200";
}
