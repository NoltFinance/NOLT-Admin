import React, { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { AuthUser } from "../utils/authService";
import WorkflowStageIndicator from "./WorkflowStageIndicator";
import {
  executeWorkflowTransition,
  updateEligibleAmount,
  reassignApplication,
} from "../services/workflowService";
import { toast } from "sonner";
import {
  getAvailableActions,
  canPerformAction,
  canProceedFromCreditCheck,
  getCurrentStage,
} from "../utils/workflowManager";
import { RequestStatus, OperationLogEntry } from "../types";

interface Form {
  id: string;
  name: string;
  type: string;
  category_type: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  submissions_count?: number;
  enable_steps?: boolean;
  step_labels?: string[];
}

interface FormField {
  id: string;
  form_id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: any;
  validation_rules: any;
  order_index: number;
  step_number?: number;
}

interface FormSubmission {
  id: string;
  form_id: string;
  applicant_email: string;
  applicant_name: string;
  field_responses: Record<string, any>;
  status: "Submitted" | "Under Review" | "Approved" | "Rejected";
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface AssignedFormsViewProps {
  currentUser: AuthUser;
}

const AssignedFormsView: React.FC<AssignedFormsViewProps> = ({
  currentUser,
}) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "Loan" | "Investment">("all");

  // View state: 'list' | 'submissions' | 'detail'
  const [viewMode, setViewMode] = useState<"list" | "submissions" | "detail">(
    "list",
  );
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<FormSubmission | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Workflow states
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignComment, setReassignComment] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"Decline" | "Return">("Decline");
  const [actionComment, setActionComment] = useState("");
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [eligibleAmount, setEligibleAmount] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  useEffect(() => {
    fetchAssignedForms();
    fetchUsers();
  }, [currentUser.id]);

  // Compute available actions whenever selection or role/context changes
  useEffect(() => {
    const computeActions = async () => {
      if (!selectedSubmission || !selectedForm) {
        setAvailableActions([]);
        return;
      }
      const applicationType = selectedForm.type as "Investment" | "Loan";
      const currentStatus = mapToRequestStatus(selectedSubmission.status);
      try {
        const actions = await getAvailableActions(
          currentUser.role,
          currentStatus,
          applicationType,
          eligibleAmount || undefined,
        );
        setAvailableActions(actions);
      } catch (e) {
        setAvailableActions([]);
      }
    };
    computeActions();
  }, [selectedSubmission, selectedForm, currentUser.role, eligibleAmount]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .neq("id", currentUser.id)
        .order("name");

      if (data) {
        setAvailableUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchAssignedForms = async () => {
    try {
      setLoading(true);
      setError(null);

      // Internal Control can view all forms, others only see assigned forms
      let query = supabase
        .from("forms")
        .select("*")
        .eq("status", "Published")
        .order("updated_at", { ascending: false });

      // If not Internal Control or Super Admin, filter by assigned forms
      if (
        currentUser.role !== "Internal Control" &&
        currentUser.role !== "Super Admin"
      ) {
        query = query.contains("administrators", [currentUser.id]);
      }

      const { data: formsData, error: formsError } = await query;

      if (formsError) throw formsError;

      // For each form, get the count of submissions
      const formsWithSubmissions = await Promise.all(
        (formsData || []).map(async (form) => {
          const { count } = await supabase
            .from("form_submissions")
            .select("*", { count: "exact", head: true })
            .eq("form_id", form.id);

          return {
            ...form,
            submissions_count: count || 0,
          };
        }),
      );

      setForms(formsWithSubmissions);
    } catch (err: any) {
      console.error("Error fetching assigned forms:", err);
      setError(err.message || "Failed to load assigned forms");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (formId: string) => {
    try {
      setSubmissionsLoading(true);
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error("Error fetching submissions:", err);
      alert("Failed to load submissions");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchFormFields = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setFormFields(data || []);
    } catch (err: any) {
      console.error("Error fetching form fields:", err);
      setFormFields([]);
    }
  };

  const handleFormClick = (form: Form) => {
    setSelectedForm(form);
    setViewMode("submissions");
    fetchSubmissions(form.id);
    fetchFormFields(form.id);
  };

  const handleSubmissionClick = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.review_notes || "");
    setViewMode("detail");
    setCurrentStep(1);
  };

  const handleBackToForms = () => {
    setViewMode("list");
    setSelectedForm(null);
    setSubmissions([]);
  };

  const handleBackToSubmissions = () => {
    setViewMode("submissions");
    setSelectedSubmission(null);
    setReviewNotes("");
    setActionComment("");
    setEligibleAmount("");
  };

  // Map submission status to RequestStatus
  const mapToRequestStatus = (
    status: FormSubmission["status"],
  ): RequestStatus => {
    const statusMap: Record<FormSubmission["status"], RequestStatus> = {
      Submitted: "Pending Review",
      "Under Review": "Docs Verification",
      Approved: "Approved",
      Rejected: "Declined",
    };
    return statusMap[status];
  };

  // Workflow action handlers
  const handleApproveClick = () => {
    setIsApprovalModalOpen(true);
    setApprovalComment("");
  };

  const handleApprove = async () => {
    if (!approvalComment.trim() || !selectedSubmission || !selectedForm) return;

    const applicationType = selectedForm.type as "Investment" | "Loan";
    const currentStatus = mapToRequestStatus(selectedSubmission.status);

    try {
      setIsProcessing(true);
      const result = await executeWorkflowTransition({
        submissionId: selectedSubmission.id,
        currentStatus,
        applicationType,
        action: "approve",
        userRole: currentUser.role,
        userId: currentUser.id,
        comment: approvalComment,
        eligibleAmount: eligibleAmount || undefined,
      });

      if (result.success && result.newStatus) {
        toast.success(result.message || "Application approved successfully");

        // Refresh data
        if (selectedForm) {
          await fetchSubmissions(selectedForm.id);
        }
        setIsApprovalModalOpen(false);
        handleBackToSubmissions();
      } else {
        toast.error(result.error || "Failed to approve application");
      }
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionTrigger = (mode: "Decline" | "Return") => {
    setActionMode(mode);
    setIsActionModalOpen(true);
    setActionComment("");
  };

  const handleActionConfirm = async () => {
    if (!actionComment.trim() || !selectedSubmission || !selectedForm) return;

    const applicationType = selectedForm.type as "Investment" | "Loan";
    const currentStatus = mapToRequestStatus(selectedSubmission.status);
    const action = actionMode === "Decline" ? "decline" : "return";

    try {
      setIsProcessing(true);
      const result = await executeWorkflowTransition({
        submissionId: selectedSubmission.id,
        currentStatus,
        applicationType,
        action,
        userRole: currentUser.role,
        userId: currentUser.id,
        comment: actionComment,
      });

      if (result.success && result.newStatus) {
        toast.success(result.message || `Application ${action}ed successfully`);

        // Refresh data
        if (selectedForm) {
          await fetchSubmissions(selectedForm.id);
        }
        setIsActionModalOpen(false);
        handleBackToSubmissions();
      } else {
        toast.error(result.error || `Failed to ${action} application`);
      }
    } catch (err) {
      console.error(`${action} error:`, err);
      toast.error(`Failed to ${action} application`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenReassignModal = () => {
    setIsReassignModalOpen(true);
    setSelectedUserId("");
    setReassignComment("");
  };

  const handleReassign = async () => {
    if (!selectedSubmission || !selectedUserId || !reassignComment.trim())
      return;

    const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;

    try {
      setIsProcessing(true);
      const result = await reassignApplication(
        selectedSubmission.id,
        selectedUserId,
        currentUser.role,
        currentUser.id,
        reassignComment,
      );

      if (result.success) {
        toast.success(
          `Application successfully reassigned to ${selectedUser.name}`,
        );

        // Refresh data
        if (selectedForm) {
          await fetchSubmissions(selectedForm.id);
        }
        setIsReassignModalOpen(false);
      } else {
        toast.error(result.error || "Failed to reassign application");
      }
    } catch (err) {
      console.error("Reassignment error:", err);
      toast.error("Failed to reassign application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEligibleAmount = async () => {
    if (!selectedSubmission || !eligibleAmount) return;

    try {
      setIsProcessing(true);
      const result = await updateEligibleAmount(
        selectedSubmission.id,
        eligibleAmount,
        currentUser.id,
        currentUser.role,
      );

      if (result.success) {
        toast.success("Eligible amount updated successfully");
      } else {
        toast.error(result.error || "Failed to update eligible amount");
      }
    } catch (err) {
      console.error("Update eligible amount error:", err);
      toast.error("Failed to update eligible amount");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateStatus = async (newStatus: FormSubmission["status"]) => {
    if (!selectedSubmission) return;

    try {
      setIsProcessing(true);
      const { error } = await supabase
        .from("form_submissions")
        .update({
          status: newStatus,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Update local state
      setSelectedSubmission({
        ...selectedSubmission,
        status: newStatus,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      });

      // Refresh submissions list
      if (selectedForm) {
        await fetchSubmissions(selectedForm.id);
      }

      alert(`Submission ${newStatus.toLowerCase()} successfully!`);
    } catch (err: any) {
      console.error("Error updating submission:", err);
      alert("Failed to update submission status");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredForms =
    filter === "all" ? forms : forms.filter((form) => form.type === filter);

  const filteredSubmissions =
    statusFilter === "All"
      ? submissions
      : submissions.filter((sub) => sub.status === statusFilter);

  const getFormTypeIcon = (type: string) => {
    return type === "Loan" ? "credit_card" : "trending_up";
  };

  const getFormTypeColor = (type: string) => {
    return type === "Loan"
      ? "bg-indigo-500/10 text-indigo-500"
      : "bg-blue-500/10 text-blue-500";
  };

  const getStatusColor = (status: FormSubmission["status"]) => {
    switch (status) {
      case "Submitted":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Under Review":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Approved":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Rejected":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Render Submission Detail View
  if (viewMode === "detail" && selectedSubmission && selectedForm) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSubmissions}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              Submission Details
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedForm.name} - {selectedSubmission.applicant_name}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg border text-sm font-bold ${getStatusColor(
              selectedSubmission.status,
            )}`}
          >
            {selectedSubmission.status}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Info */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  person
                </span>
                Applicant Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Name
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.applicant_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedSubmission.applicant_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Submitted At
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>
                {selectedSubmission.reviewed_at && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Reviewed At
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {new Date(
                        selectedSubmission.reviewed_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Responses */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  description
                </span>
                Form Responses
              </h2>

              {/* Step Tabs */}
              {selectedForm?.enable_steps &&
                selectedForm?.step_labels &&
                selectedForm.step_labels.length > 0 && (
                  <div className="mb-6 flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto">
                    {selectedForm.step_labels.map((label, idx) => {
                      const stepNumber = idx + 1;
                      const fieldsInStep = formFields.filter(
                        (f) => (f.step_number || 1) === stepNumber,
                      ).length;
                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentStep(stepNumber)}
                          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
                            currentStep === stepNumber
                              ? "bg-white dark:bg-slate-800 text-purple-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                currentStep === stepNumber
                                  ? "bg-purple-500 text-white"
                                  : "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {stepNumber}
                            </div>
                            <span>{label}</span>
                          </div>
                          {fieldsInStep > 0 && (
                            <div className="text-[9px] font-bold text-slate-400 mt-1">
                              {fieldsInStep} field
                              {fieldsInStep !== 1 ? "s" : ""}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

              <div className="space-y-4">
                {formFields.length > 0 ? (
                  formFields
                    .filter((field) => {
                      if (!selectedForm?.enable_steps) return true;
                      return (field.step_number || 1) === currentStep;
                    })
                    .map((field) => {
                      const value =
                        selectedSubmission.field_responses[field.id];
                      return (
                        <div
                          key={field.id}
                          className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            {field.label}
                            {field.required && (
                              <span className="text-rose-500 ml-1">*</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {field.field_type === "file" && value ? (
                              <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  attach_file
                                </span>
                                View File
                              </a>
                            ) : field.field_type === "signature" && value ? (
                              <div className="mt-2">
                                <img
                                  src={value}
                                  alt="Signature"
                                  className="max-w-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white p-2"
                                />
                              </div>
                            ) : typeof value === "object" ? (
                              <pre className="bg-slate-50 dark:bg-surface-darker p-3 rounded-lg text-xs overflow-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              value?.toString() || (
                                <span className="text-slate-400 italic">
                                  Not provided
                                </span>
                              )
                            )}
                          </p>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <p className="text-sm">Loading form fields...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="space-y-6">
            {/* Workflow Stage Indicator */}
            {selectedForm.type &&
              (selectedForm.type === "Investment" ||
                selectedForm.type === "Loan") && (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <WorkflowStageIndicator
                    currentStatus={mapToRequestStatus(
                      selectedSubmission.status,
                    )}
                    workflowType={selectedForm.type as "Investment" | "Loan"}
                    userRole={currentUser.role}
                  />
                </div>
              )}

            {/* Eligible Amount (Credit Check for Loans) */}
            {selectedForm.type === "Loan" &&
              mapToRequestStatus(selectedSubmission.status) ===
                "Internal Audit" &&
              currentUser.role === "Credit" && (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      payments
                    </span>
                    Eligible Amount
                  </h2>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={eligibleAmount}
                      onChange={(e) => setEligibleAmount(e.target.value)}
                      placeholder="Enter eligible amount..."
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-surface-darker text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      onClick={handleUpdateEligibleAmount}
                      disabled={isProcessing || !eligibleAmount}
                      className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Eligible Amount
                    </button>
                  </div>
                </div>
              )}

            {/* Review Notes */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  edit_note
                </span>
                Review Notes
              </h2>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this submission..."
                className="w-full h-32 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-surface-darker text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Workflow Actions */}
            {selectedForm.type &&
              (selectedForm.type === "Investment" ||
                selectedForm.type === "Loan") && (
                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                    Workflow Actions
                  </h2>
                  <div className="space-y-3">
                    {/* Approve Action */}
                    {availableActions.includes("approve") && (
                      <button
                        onClick={handleApproveClick}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing && isApprovalModalOpen ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                        )}
                        Approve & Continue
                      </button>
                    )}

                    {/* Return Action */}
                    {availableActions.includes("return") && (
                      <button
                        onClick={() => handleActionTrigger("Return")}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">
                          undo
                        </span>
                        Return to Previous
                      </button>
                    )}

                    {/* Decline Action */}
                    {availableActions.includes("decline") && (
                      <button
                        onClick={() => handleActionTrigger("Decline")}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">
                          cancel
                        </span>
                        Decline Application
                      </button>
                    )}

                    {/* Reassign Action */}
                    {availableActions.includes("reassign") && (
                      <button
                        onClick={handleOpenReassignModal}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">
                          swap_horiz
                        </span>
                        Reassign Owner
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* Previous Notes */}
            {selectedSubmission.review_notes && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                <h2 className="text-sm font-black text-amber-900 dark:text-amber-100 mb-2">
                  Previous Notes
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {selectedSubmission.review_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Submissions List View
  if (viewMode === "submissions" && selectedForm) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToForms}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              {selectedForm.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review and manage submissions for this form
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
          {["All", "Submitted", "Under Review", "Approved", "Rejected"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all relative ${
                  statusFilter === status
                    ? "text-primary"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {status}
                {statusFilter === status && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                )}
              </button>
            ),
          )}
        </div>

        {/* Loading */}
        {submissionsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading submissions...
              </p>
            </div>
          </div>
        )}

        {/* Submissions List */}
        {!submissionsLoading && (
          <>
            {filteredSubmissions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-slate-400 text-6xl mb-4">
                  inbox
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  No Submissions
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {statusFilter === "All"
                    ? "No submissions have been received for this form yet."
                    : `No ${statusFilter.toLowerCase()} submissions found.`}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-surface-darker border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className="hover:bg-slate-50 dark:hover:bg-surface-darker transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {submission.applicant_name}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {submission.applicant_email}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(
                              submission.status,
                            )}`}
                          >
                            {submission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(
                              submission.submitted_at,
                            ).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleSubmissionClick(submission)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats */}
            {filteredSubmissions.length > 0 && (
              <div className="bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {["Submitted", "Under Review", "Approved", "Rejected"].map(
                    (status) => (
                      <div key={status} className="text-center">
                        <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                          {
                            submissions.filter((s) => s.status === status)
                              .length
                          }
                        </p>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {status}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Render Forms List View (Default)

  const isInternalControlOrSuperAdmin =
    currentUser.role === "Internal Control" ||
    currentUser.role === "Super Admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {isInternalControlOrSuperAdmin ? "All Forms" : "My Assigned Forms"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isInternalControlOrSuperAdmin
              ? "View and manage all form submissions"
              : "Forms you have been assigned to manage and review"}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {["all", "Loan", "Investment"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all relative ${
              filter === tab
                ? "text-primary"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "all" ? "All Forms" : `${tab}s`}
            {filter === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading your assigned forms...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-rose-500 text-4xl mb-3">
            error
          </span>
          <h3 className="text-lg font-bold text-rose-900 dark:text-rose-100 mb-2">
            Error Loading Forms
          </h3>
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <button
            onClick={fetchAssignedForms}
            className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Forms Grid */}
      {!loading && !error && (
        <>
          {filteredForms.length === 0 ? (
            <div className="bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-slate-400 text-6xl mb-4">
                assignment
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No Forms Assigned
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {filter === "all"
                  ? "You haven't been assigned to manage any forms yet. Contact your administrator for access."
                  : `No ${filter} forms have been assigned to you.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  onClick={() => handleFormClick(form)}
                  className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                >
                  {/* Form Type Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getFormTypeColor(
                        form.type,
                      )}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {getFormTypeIcon(form.type)}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {form.type}
                      </span>
                    </div>
                  </div>

                  {/* Form Name */}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                    {form.name}
                  </h3>

                  {/* Category */}
                  {form.category_type && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Category: {form.category_type}
                    </p>
                  )}

                  {/* Description */}
                  {form.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-4 line-clamp-2">
                      {form.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="material-symbols-outlined text-sm">
                        description
                      </span>
                      <span className="text-xs font-bold">
                        {form.submissions_count || 0} Submission
                        {form.submissions_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {filteredForms.length > 0 && (
            <div className="bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                    {filteredForms.length}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned Forms
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                    {filteredForms.reduce(
                      (acc, form) => acc + (form.submissions_count || 0),
                      0,
                    )}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Submissions
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                    {filteredForms.filter((f) => f.type === "Loan").length}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Loan Forms
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Modal (Decline/Return) */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {actionMode === "Decline"
                    ? "Decline Application"
                    : "Return to Previous Node"}
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-bold">
                  {actionMode === "Decline"
                    ? "Provide a reason for rejecting this application."
                    : "State what needs to be corrected by the previous team."}
                </p>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Decision Comment
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white placeholder:text-slate-400"
                  placeholder="Enter your specific reasons or correction instructions..."
                  rows={4}
                />
                {!actionComment.trim() && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                    A comment is required to proceed.
                  </p>
                )}
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest"
              >
                Discard
              </button>
              <button
                onClick={handleActionConfirm}
                disabled={!actionComment.trim() || isProcessing}
                className={`px-8 py-4 text-white text-[10px] font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${actionMode === "Decline" ? "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600" : "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"}`}
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">
                    {actionMode === "Decline" ? "cancel" : "undo"}
                  </span>
                )}
                Confirm {actionMode}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Approve Application
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-bold">
                  Add a decision note before approval.
                </p>
              </div>
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Decision Comment
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white placeholder:text-slate-400"
                  placeholder="Briefly describe the approval decision..."
                  rows={4}
                />
                {!approvalComment.trim() && (
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                    A comment is required to proceed.
                  </p>
                )}
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest"
              >
                Discard
              </button>
              <button
                onClick={handleApprove}
                disabled={!approvalComment.trim() || isProcessing}
                className="px-8 py-4 bg-emerald-500 text-white text-[10px] font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">
                    check_circle
                  </span>
                )}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Reassign Application
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-bold">
                  Transfer ownership to another team member
                </p>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Select New Owner
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white font-bold"
                >
                  <option value="">-- Select User --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                {!selectedUserId && (
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                    Please select a user to proceed
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Reassignment Comment
                </label>
                <textarea
                  value={reassignComment}
                  onChange={(e) => setReassignComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white placeholder:text-slate-400"
                  placeholder="Explain why this application is being reassigned..."
                  rows={4}
                />
                {!reassignComment.trim() && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                    A comment is required to proceed.
                  </p>
                )}
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">
                    info
                  </span>
                  <div>
                    <p className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-wide mb-1">
                      Reassignment Notice
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      The selected user will become the new owner and will be
                      notified of this change. This action will be logged in the
                      operation history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={
                  !selectedUserId || !reassignComment.trim() || isProcessing
                }
                className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-2xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">
                    swap_horiz
                  </span>
                )}
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedFormsView;
