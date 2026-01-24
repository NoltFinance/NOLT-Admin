import supabase from "../utils/supabase";
import {
  FormSubmission,
  ReviewRequest,
  RequestStatus,
  UserRole,
} from "../types";
import {
  getNextStatus,
  canPerformAction,
  getAvailableActions,
  canProceedFromCreditCheck,
  getCurrentStage,
  canViewApplication,
} from "../utils/workflowManager";
import { logWorkflowAction } from "./auditService";

/**
 * Workflow Transition Service
 * Handles all status transitions with workflow validation
 */

export interface WorkflowTransitionParams {
  submissionId: string;
  currentStatus: RequestStatus;
  applicationType: "Investment" | "Loan";
  action: "approve" | "decline" | "return";
  userRole: UserRole;
  userId: string;
  comment?: string;
  eligibleAmount?: string;
  reassignTo?: string;
}

export interface WorkflowTransitionResult {
  success: boolean;
  newStatus?: RequestStatus;
  error?: string;
  message?: string;
}

/**
 * Validate and execute a workflow transition
 */
export async function executeWorkflowTransition(
  params: WorkflowTransitionParams,
): Promise<WorkflowTransitionResult> {
  const {
    submissionId,
    currentStatus,
    applicationType,
    action,
    userRole,
    userId,
    comment,
    eligibleAmount,
    reassignTo,
  } = params;

  try {
    // Validate permission
    if (!canPerformAction(userRole, currentStatus, applicationType, action)) {
      return {
        success: false,
        error: `Your role (${userRole}) cannot perform ${action} at stage: ${currentStatus}`,
      };
    }

    // Special validation for Credit Check
    if (
      action === "approve" &&
      applicationType === "Loan" &&
      currentStatus === "Internal Audit" &&
      userRole === "Credit"
    ) {
      if (!canProceedFromCreditCheck(eligibleAmount)) {
        return {
          success: false,
          error:
            "Eligible Amount must be supplied before proceeding from Credit Check",
        };
      }
    }

    // Get next status
    const newStatus = getNextStatus(currentStatus, applicationType, action);

    // Build update object
    const updateData: any = {
      status: mapRequestStatusToFormSubmissionStatus(newStatus),
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    };

    // Add review notes
    if (comment) {
      updateData.review_notes = comment;
    }

    // Add eligible amount for Credit Check
    if (eligibleAmount && applicationType === "Loan") {
      // Store in field_responses
      const { data: currentSubmission } = await supabase
        .from("form_submissions")
        .select("field_responses")
        .eq("id", submissionId)
        .single();

      if (currentSubmission) {
        updateData.field_responses = {
          ...currentSubmission.field_responses,
          eligible_amount: eligibleAmount,
        };
      }
    }

    // Execute update
    const { data, error } = await supabase
      .from("form_submissions")
      .update(updateData)
      .eq("id", submissionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating submission:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Log the transition
    await logWorkflowTransition({
      submissionId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      action,
      userId,
      userRole,
      comment,
    });

    const stage = getCurrentStage(newStatus, applicationType);
    return {
      success: true,
      newStatus,
      message: `Application moved to: ${stage?.label || newStatus}`,
    };
  } catch (err) {
    console.error("Workflow transition error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to execute transition",
    };
  }
}

/**
 * Update eligible amount for loan applications (Credit team)
 */
export async function updateEligibleAmount(
  submissionId: string,
  eligibleAmount: string,
  userId: string,
  userRole?: UserRole,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentSubmission } = await supabase
      .from("form_submissions")
      .select("field_responses")
      .eq("id", submissionId)
      .single();

    if (!currentSubmission) {
      return { success: false, error: "Submission not found" };
    }

    const { error } = await supabase
      .from("form_submissions")
      .update({
        field_responses: {
          ...currentSubmission.field_responses,
          eligible_amount: eligibleAmount,
        },
      })
      .eq("id", submissionId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the eligible amount update
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    await logWorkflowAction(
      "UPDATE",
      submissionId,
      {
        workflowAction: "update_eligible_amount",
        eligibleAmount: eligibleAmount,
        previousAmount: currentSubmission.field_responses?.eligible_amount,
      },
      userId,
      user?.email,
      userRole,
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to update eligible amount",
    };
  }
}

/**
 * Reassign application owner (Sales Manager only)
 */
export async function reassignApplication(
  submissionId: string,
  newOwnerId: string,
  userRole: UserRole,
  currentUserId?: string,
  comment?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (userRole !== "Sales Manager" && userRole !== "Super Admin") {
      return {
        success: false,
        error: "Only Sales Manager and Super Admin can reassign applications",
      };
    }

    // Get current owner before reassignment
    const { data: currentSubmission } = await supabase
      .from("form_submissions")
      .select("reviewed_by")
      .eq("id", submissionId)
      .single();

    const { error } = await supabase
      .from("form_submissions")
      .update({
        reviewed_by: newOwnerId,
      })
      .eq("id", submissionId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the reassignment
    if (currentUserId) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("email")
        .eq("id", currentUserId)
        .single();

      const { data: newOwner } = await supabase
        .from("users")
        .select("email")
        .eq("id", newOwnerId)
        .single();

      await logWorkflowAction(
        "UPDATE",
        submissionId,
        {
          workflowAction: "reassign",
          reassignedTo: newOwner?.email || newOwnerId,
          reassignedFrom: currentSubmission?.reviewed_by || "unassigned",
          comment: comment,
        },
        currentUserId,
        currentUser?.email,
        userRole,
      );
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to reassign application",
    };
  }
}

/**
 * Get workflow context for a submission
 */
export async function getWorkflowContext(
  submissionId: string,
  userRole: UserRole,
  userId: string,
) {
  try {
    const { data: submission, error } = await supabase
      .from("form_submissions")
      .select("*, forms(*)")
      .eq("id", submissionId)
      .single();

    if (error || !submission) {
      return { success: false, error: "Submission not found" };
    }

    const applicationType = submission.forms?.type as "Investment" | "Loan";
    const currentStatus = mapFormSubmissionStatusToRequestStatus(
      submission.status,
    );
    const eligibleAmount = submission.field_responses?.eligible_amount;

    // Check visibility
    const canView = canViewApplication(
      userRole,
      applicationType,
      submission.reviewed_by,
      userId,
    );

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view this application",
      };
    }

    // Get available actions
    const actions = getAvailableActions(
      userRole,
      currentStatus,
      applicationType,
      eligibleAmount,
    );

    // Get current stage
    const currentStage = getCurrentStage(currentStatus, applicationType);

    return {
      success: true,
      data: {
        submission,
        applicationType,
        currentStatus,
        currentStage,
        availableActions: actions,
        eligibleAmount,
        canView,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to get workflow context",
    };
  }
}

/**
 * Log workflow transition to audit table
 */
async function logWorkflowTransition(params: {
  submissionId: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  action: string;
  userId: string;
  userRole: UserRole;
  comment?: string;
}) {
  try {
    // Get user details
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", params.userId)
      .single();

    // Log to audit_logs table
    await logWorkflowAction(
      "UPDATE",
      params.submissionId,
      {
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        workflowAction: params.action,
        comment: params.comment,
      },
      params.userId,
      user?.email,
      params.userRole,
    );

    console.log("Workflow transition logged:", params);
  } catch (err) {
    console.error("Error logging workflow transition:", err);
  }
}

/**
 * Map RequestStatus to FormSubmission status
 */
function mapRequestStatusToFormSubmissionStatus(
  status: RequestStatus,
): "Submitted" | "Under Review" | "Approved" | "Rejected" {
  const statusMap: Record<RequestStatus, any> = {
    "Pending Review": "Submitted",
    "Docs Verification": "Under Review",
    "Internal Audit": "Under Review",
    "Pending Disbursement": "Under Review",
    Approved: "Approved",
    Declined: "Rejected",
    Returned: "Submitted",
  };
  return statusMap[status] || "Submitted";
}

/**
 * Map FormSubmission status to RequestStatus
 */
function mapFormSubmissionStatusToRequestStatus(status: string): RequestStatus {
  const statusMap: Record<string, RequestStatus> = {
    Submitted: "Pending Review",
    "Under Review": "Docs Verification",
    Approved: "Approved",
    Rejected: "Declined",
  };
  return statusMap[status] || "Pending Review";
}

/**
 * Bulk status update (for batch operations)
 */
export async function bulkUpdateStatus(
  submissionIds: string[],
  action: "approve" | "decline",
  userRole: UserRole,
  userId: string,
  comment?: string,
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const id of submissionIds) {
    try {
      // Get submission details first
      const { data: submission } = await supabase
        .from("form_submissions")
        .select("*, forms(*)")
        .eq("id", id)
        .single();

      if (!submission) {
        results.failed++;
        results.errors.push(`Submission ${id} not found`);
        continue;
      }

      const applicationType = submission.forms?.type as "Investment" | "Loan";
      const currentStatus = mapFormSubmissionStatusToRequestStatus(
        submission.status,
      );

      const result = await executeWorkflowTransition({
        submissionId: id,
        currentStatus,
        applicationType,
        action,
        userRole,
        userId,
        comment,
      });

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(result.error || `Failed to update ${id}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`Error processing ${id}: ${err}`);
    }
  }

  return results;
}
