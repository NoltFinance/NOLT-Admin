import { UserRole, RequestStatus, RequestType } from "../types";

/**
 * NOLT Finance - Approval Workflow Manager
 *
 * This module implements the sequential approval workflow as defined in the
 * Application Process & Approval Workflow document.
 */

// ============================================================================
// WORKFLOW STAGE DEFINITIONS
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
 * Loan Application Flow (5 Stages)
 * 1. Submission → 2. Customer Validation → 3. Credit Check → 4. Request For Payment → 5. Disbursed
 */
export const LOAN_WORKFLOW: WorkflowStage[] = [
  {
    id: "submission",
    label: "Submission",
    status: "Pending Review",
    description:
      "Sales Staff gathers requirements. For IPPIS products, IPPIS Number and MDA are mandatory.",
    gateKeepers: ["Sales Manager", "Super Admin"],
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
    gateKeepers: ["Sales Manager", "Super Admin"],
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
 * Check if user can perform action at current stage
 */
export function canPerformAction(
  userRole: UserRole,
  currentStatus: RequestStatus,
  applicationType: RequestType,
  action: "approve" | "decline" | "return" | "edit",
): boolean {
  const workflow =
    applicationType === "Loan" ? LOAN_WORKFLOW : INVESTMENT_WORKFLOW;
  const currentStage = workflow.find((stage) => stage.status === currentStatus);

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
 * Get next status based on action
 */
export function getNextStatus(
  currentStatus: RequestStatus,
  applicationType: RequestType,
  action: "approve" | "decline" | "return",
): RequestStatus {
  const workflow =
    applicationType === "Loan" ? LOAN_WORKFLOW : INVESTMENT_WORKFLOW;
  const currentStage = workflow.find((stage) => stage.status === currentStatus);

  if (!currentStage) return currentStatus;

  const nextStageId = currentStage.nextStageOn[action];

  if (action === "decline") return "Declined";
  if (action === "return") return "Returned";

  const nextStage = workflow.find((stage) => stage.id === nextStageId);
  return nextStage?.status || currentStatus;
}

/**
 * Get current workflow stage details
 */
export function getCurrentStage(
  status: RequestStatus,
  applicationType: RequestType,
): WorkflowStage | null {
  const workflow =
    applicationType === "Loan" ? LOAN_WORKFLOW : INVESTMENT_WORKFLOW;
  return workflow.find((stage) => stage.status === status) || null;
}

/**
 * Get all stages for a workflow type
 */
export function getWorkflowStages(
  applicationType: RequestType,
): WorkflowStage[] {
  return applicationType === "Loan" ? LOAN_WORKFLOW : INVESTMENT_WORKFLOW;
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
 * Get available actions for user at current stage
 */
export function getAvailableActions(
  userRole: UserRole,
  currentStatus: RequestStatus,
  applicationType: RequestType,
  eligibleAmount?: string,
): string[] {
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

  if (canPerformAction(userRole, currentStatus, applicationType, "approve")) {
    actions.push("approve");
  }

  if (canPerformAction(userRole, currentStatus, applicationType, "decline")) {
    actions.push("decline");
  }

  if (canPerformAction(userRole, currentStatus, applicationType, "return")) {
    actions.push("return");
  }

  if (canPerformAction(userRole, currentStatus, applicationType, "edit")) {
    actions.push("edit");
  }

  // Reassign action for Sales Manager
  if (userRole === "Sales Manager" || userRole === "Super Admin") {
    actions.push("reassign");
  }

  return actions;
}

/**
 * Get approval gate number (for display)
 */
export function getApprovalGateNumber(
  status: RequestStatus,
  applicationType: RequestType,
): string {
  const stage = getCurrentStage(status, applicationType);
  if (!stage) return "";

  const workflow = getWorkflowStages(applicationType);
  const index = workflow.findIndex((s) => s.id === stage.id);

  if (index === -1) return "";

  return `Gate ${index + 1}`;
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
