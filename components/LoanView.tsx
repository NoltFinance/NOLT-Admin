import React, { useState, useEffect, useMemo } from "react";
import {
  ReviewRequest,
  UserRole,
  RequestStatus,
  OperationLogEntry,
  FormField,
  CustomForm,
  FormSubmission,
} from "../types";
import ExportFieldsModal from "./ExportFieldsModal";
import ApprovalStepper from "./ApprovalStepper";
import WorkflowStageIndicator from "./WorkflowStageIndicator";
import { flattenLoan, downloadAsCSV } from "../utils/exportUtils";
import { getSubmissionsByType } from "../services/submissionsService";
import {
  executeWorkflowTransition,
  updateEligibleAmount,
  reassignApplication,
} from "../services/workflowService";
import {
  getAvailableActions,
  canPerformAction,
  canProceedFromCreditCheck,
} from "../utils/workflowManager";
import { AuthUser } from "../utils/authService";
import supabase from "../utils/supabase";
import { toast } from "sonner";

interface LoanViewProps {
  requests: ReviewRequest[];
  onBack: () => void;
  selectedId?: string | null;
  onClearSelection?: () => void;
  onSelectLoan?: (id: string) => void;
  currentUser: AuthUser;
}

const SALES_OFFICERS = [
  "Chidi Okoro",
  "Funke Akindele",
  "Emeka Okafor",
  "Blessing Udoh",
  "Alex Morgan",
  "Sarah Jenkins",
  "Michael Scott",
];

const LOAN_EXPORT_CATEGORIES = [
  {
    title: "Identity & Financial",
    fields: [
      { id: "Reference ID", label: "Reference ID" },
      { id: "Full Name", label: "Full Name" },
      { id: "Email", label: "Email" },
      { id: "Monthly Income", label: "Monthly Income" },
      { id: "Has Active Loans", label: "Has Active Loans" },
      { id: "BVN", label: "BVN" },
      { id: "NIN", label: "NIN" },
    ],
  },
  {
    title: "Loan Specification",
    fields: [
      { id: "Category", label: "Category" },
      { id: "Product", label: "Product" },
      { id: "Amount", label: "Principal Amount" },
      { id: "Repayment Period", label: "Repayment Period" },
      { id: "Status", label: "Application Status" },
    ],
  },
  {
    title: "Personal & Residence",
    fields: [
      { id: "Gender", label: "Gender" },
      { id: "DOB", label: "Date of Birth" },
      { id: "Residential Status", label: "Residential Status" },
      { id: "Home Address", label: "Home Address" },
      { id: "Dependents", label: "Dependents" },
    ],
  },
];

const getApprovalNode = (status: RequestStatus) => {
  switch (status) {
    case "Returned":
      return {
        label: "Returned",
        color: "text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100",
      };
    case "Pending Review":
      return {
        label: "Submission",
        color:
          "text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100",
      };
    case "Docs Verification":
      return {
        label: "Customer Validation",
        color:
          "text-amber-600 bg-amber-50 dark:bg-amber-900/10 border-amber-100",
      };
    case "Internal Audit":
      return {
        label: "Credit Check",
        color:
          "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100",
      };
    case "Pending Disbursement":
      return {
        label: "Request For Payment",
        color:
          "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100",
      };
    case "Approved":
      return {
        label: "Disbursed",
        color:
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100",
      };
    case "Declined":
      return {
        label: "Rejected",
        color: "text-rose-600 bg-rose-50 dark:bg-rose-900/10 border-rose-100",
      };
    default:
      return {
        label: "Processing",
        color:
          "text-slate-600 bg-slate-50 dark:bg-slate-900/10 border-slate-100",
      };
  }
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Pending Review":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Docs Verification":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "Internal Audit":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "Pending Disbursement":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Returned":
    case "Declined":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const LoanView: React.FC<LoanViewProps> = ({
  requests,
  onBack,
  selectedId,
  onClearSelection,
  onSelectLoan,
  currentUser,
}) => {
  console.log("🏗️ LoanView mounted/rendered - selectedId:", selectedId);

  const [selectedLoan, setSelectedLoan] = useState<ReviewRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [nodeFilter, setNodeFilter] = useState("All Nodes");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineComment, setDeclineComment] = useState("");
  const [declineMode, setDeclineMode] = useState<"Decline" | "Return">(
    "Decline",
  );
  const [isDeclining, setIsDeclining] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // New Credit state
  const [localEligibleAmount, setLocalEligibleAmount] = useState("");

  const [localOwnerName, setLocalOwnerName] = useState("");
  const [localSource, setLocalSource] = useState("REFERRED_LINK");
  const [loanRequests, setLoanRequests] = useState<ReviewRequest[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  // Reassignment states
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Form fields and submission data
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formSubmission, setFormSubmission] = useState<FormSubmission | null>(
    null,
  );
  const [formConfig, setFormConfig] = useState<CustomForm | null>(null);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [reassignComment, setReassignComment] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // Fetch loan submissions from database
  useEffect(() => {
    const fetchLoans = async () => {
      console.log("🔄 Fetching loans from database...");
      setIsLoadingLoans(true);
      try {
        const { data, error } = await getSubmissionsByType("Loan");
        console.log("📊 Loan data received:", data?.length || 0, "records");
        if (!error && data) {
          setLoanRequests(data);
        } else {
          console.error("Error fetching loan submissions:", error);
          // Fallback to requests prop if database fetch fails
          setLoanRequests(requests.filter((req) => req.type === "Loan"));
        }
      } catch (err) {
        console.error("Unexpected error fetching loans:", err);
        setLoanRequests(requests.filter((req) => req.type === "Loan"));
      } finally {
        setIsLoadingLoans(false);
      }
    };

    fetchLoans();
  }, []); // Remove requests dependency - we fetch directly from database

  // Compute available actions when selection or role changes
  useEffect(() => {
    const computeActions = async () => {
      if (!selectedLoan) {
        setAvailableActions([]);
        return;
      }
      try {
        const actions = await getAvailableActions(
          currentUser.role,
          selectedLoan.status,
          "Loan",
          selectedLoan.eligibleAmount || localEligibleAmount,
        );
        setAvailableActions(actions);
      } catch (e) {
        setAvailableActions([]);
      }
    };
    computeActions();
  }, [selectedLoan, currentUser.role, localEligibleAmount]);

  // Fetch users for reassignment
  useEffect(() => {
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

    fetchUsers();
  }, [currentUser.id]);

  // Fetch form configuration, fields, and submission data
  const fetchFormData = async (submissionId: string, loan: ReviewRequest) => {
    setIsLoadingFormData(true);
    console.log("Fetching form data for submission ID:", submissionId);
    try {
      // Fetch the submission
      const { data: submission, error: subError } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (subError || !submission) {
        console.error("Error fetching submission:", subError);
        setIsLoadingFormData(false);
        return;
      }

      console.log("Submission fetched:", submission);
      setFormSubmission(submission);

      // Fetch the form configuration
      const { data: form, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", submission.form_id)
        .single();

      if (formError || !form) {
        console.error("Error fetching form:", formError);
        setIsLoadingFormData(false);
        return;
      }

      console.log("Form config fetched:", form);
      setFormConfig(form);

      // Fetch form fields
      const { data: fields, error: fieldsError } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", submission.form_id)
        .order("order_index", { ascending: true });

      if (fieldsError) {
        console.error("Error fetching form fields:", fieldsError);
        setIsLoadingFormData(false);
        return;
      }

      console.log("Form fields fetched:", fields?.length || 0, "fields");
      setFormFields(fields || []);

      // Fetch audit logs for this submission
      const { data: auditLogs, error: auditError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("record_id", submissionId)
        .order("created_at", { ascending: false });

      if (auditError) {
        console.error("Error fetching audit logs:", auditError);
      } else {
        console.log("Audit logs fetched:", auditLogs?.length || 0, "logs");
        // Update selectedLoan with operation logs
        const operationLogs: OperationLogEntry[] = (auditLogs || []).map(
          (log: any) => {
            // Determine the action label based on workflow_action
            let actionLabel = log.action;
            if (log.new_data?.workflow_action) {
              const workflowAction = log.new_data.workflow_action;
              switch (workflowAction) {
                case "approve":
                  actionLabel = "APPROVED";
                  break;
                case "decline":
                  actionLabel = "DECLINED";
                  break;
                case "return":
                  actionLabel = "RETURNED";
                  break;
                case "reassign":
                  actionLabel = "REASSIGNED";
                  break;
                case "update_eligible_amount":
                  actionLabel = "UPDATED ELIGIBLE AMOUNT";
                  break;
                default:
                  actionLabel = workflowAction.toUpperCase().replace("_", " ");
              }
            }

            // Build a detailed comment
            let detailedComment = log.new_data?.comment || "";
            if (log.new_data?.fromStatus && log.new_data?.toStatus) {
              detailedComment = `Status changed from "${log.new_data.fromStatus}" to "${log.new_data.toStatus}". ${detailedComment}`;
            } else if (log.new_data?.reassignedTo) {
              detailedComment = `Reassigned to ${log.new_data.reassignedTo}. ${detailedComment}`;
            } else if (log.new_data?.eligibleAmount) {
              detailedComment = `Eligible amount set to ${log.new_data.eligibleAmount}. ${detailedComment}`;
            }

            return {
              id: log.id,
              timestamp: new Date(log.created_at).toLocaleString(),
              actor: log.user_email || "System",
              action: actionLabel,
              comment: detailedComment.trim(),
              fromStatus: log.new_data?.fromStatus,
              toStatus: log.new_data?.toStatus,
            };
          },
        );
        setSelectedLoan({
          ...loan,
          operationLogs,
        });
      }

      setIsLoadingFormData(false);
    } catch (err) {
      console.error("Error fetching form data:", err);
      setIsLoadingFormData(false);
    }
  };

  useEffect(() => {
    console.log(
      "🎯 Selection changed - selectedId:",
      selectedId,
      "loanRequests:",
      loanRequests.length,
    );
    if (selectedId) {
      const found = loanRequests.find((r) => r.id === selectedId);
      console.log(
        "🔍 Search result for ID",
        selectedId,
        ":",
        found ? "FOUND" : "NOT FOUND",
      );
      if (found) {
        console.log("✅ Selected loan found:", found);
        setSelectedLoan(found);
        setLocalOwnerName(found.ownerName || "UNASSIGNED");
        setLocalEligibleAmount(found.eligibleAmount || "");

        // Fetch form data for selected submission
        console.log("About to fetch form data for ID:", found.id);
        fetchFormData(found.id, found);
      }
    } else {
      setSelectedLoan(null);
      setFormFields([]);
      setFormSubmission(null);
      setFormConfig(null);
    }
  }, [selectedId, loanRequests]);

  const filteredLoans = useMemo(
    () =>
      loanRequests.filter((req) => {
        const matchesSearch =
          req.applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.referenceId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "All Status" || req.status === statusFilter;
        const node = getApprovalNode(req.status);
        const matchesNode =
          nodeFilter === "All Nodes" || node.label === nodeFilter;
        return matchesSearch && matchesStatus && matchesNode;
      }),
    [loanRequests, searchTerm, statusFilter, nodeFilter],
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLoans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLoans.map((req) => req.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmExport = (selectedFields: string[]) => {
    const targetDataset =
      selectedIds.size > 0
        ? filteredLoans.filter((req) => selectedIds.has(req.id))
        : filteredLoans;

    const dataToExport = targetDataset.map((req) => {
      const flattened = flattenLoan(req);
      const filtered: any = {};
      selectedFields.forEach((field) => {
        filtered[field] = (flattened as any)[field];
      });
      return filtered;
    });

    downloadAsCSV(
      dataToExport,
      `NOLT_Loans_Export_${new Date().toISOString().split("T")[0]}`,
    );
    setIsExportModalOpen(false);
  };

  const toggleVisibility = (label: string) => {
    const next = new Set(visibleFields);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setVisibleFields(next);
  };

  const handleOpenReassignModal = () => {
    setIsReassignModalOpen(true);
    setSelectedUserId("");
    setReassignComment("");
  };

  const handleSaveReassignment = async () => {
    if (!selectedLoan || !selectedUserId || !reassignComment.trim()) return;

    const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;

    try {
      setIsReassigning(true);
      const { reassignApplication } =
        await import("../services/workflowService");
      const result = await reassignApplication(
        selectedLoan.id,
        selectedUserId,
        currentUser.role,
        currentUser.id,
        reassignComment,
      );

      if (result.success) {
        const log: OperationLogEntry = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleString(),
          actor: currentUser.name,
          action: "RE-ASSIGNED OWNER",
          comment: `Transferred ownership to ${selectedUser.name} (${selectedUser.role})`,
        };
        selectedLoan.operationLogs = [
          log,
          ...(selectedLoan.operationLogs || []),
        ];
        selectedLoan.ownerName = selectedUser.name;
        setSelectedLoan({ ...selectedLoan });
        setLocalOwnerName(selectedUser.name);
        setLocalSource("RE-ASSIGNMENT");

        // Refresh data
        const { data } = await getSubmissionsByType("Loan");
        if (data) setLoanRequests(data);

        toast.success(
          `Application successfully reassigned to ${selectedUser.name}`,
        );
      } else {
        toast.error(result.error || "Failed to reassign application");
      }
    } catch (err) {
      console.error("Reassignment error:", err);
      toast.error("Failed to reassign application");
    } finally {
      setIsReassignModalOpen(false);
      setIsReassigning(false);
    }
  };

  const handleAuditPass = async () => {
    if (!selectedLoan) return;

    try {
      setIsApproving(true);
      const result = await executeWorkflowTransition({
        submissionId: selectedLoan.id,
        currentStatus: selectedLoan.status,
        applicationType: "Loan",
        action: "approve",
        userRole: currentUser.role,
        userId: currentUser.id,
        comment:
          "Loan compliance verified. Moving to Finance for payout confirmation.",
      });

      if (result.success) {
        toast.success(result.message || "Final audit passed");
        // Refetch loans to update UI
        const { data, error } = await getSubmissionsByType("Loan");
        if (!error && data) {
          setLoanRequests(data);
          const updated = data.find(
            (r: ReviewRequest) => r.id === selectedLoan.id,
          );
          if (updated) setSelectedLoan(updated);
        }
      } else {
        toast.error(result.error || "Failed to complete audit pass");
      }
    } catch (error) {
      console.error("Error passing audit:", error);
      toast.error("Failed to complete audit pass. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmDisbursement = async () => {
    if (!selectedLoan) return;

    try {
      setIsApproving(true);
      const result = await executeWorkflowTransition({
        submissionId: selectedLoan.id,
        currentStatus: selectedLoan.status,
        applicationType: "Loan",
        action: "approve",
        userRole: currentUser.role,
        userId: currentUser.id,
        comment: "Payout confirmed by Finance Team.",
      });

      if (result.success) {
        toast.success(result.message || "Disbursement confirmed");
        // Refetch loans to update UI
        const { data, error } = await getSubmissionsByType("Loan");
        if (!error && data) {
          setLoanRequests(data);
          const updated = data.find(
            (r: ReviewRequest) => r.id === selectedLoan.id,
          );
          if (updated) setSelectedLoan(updated);
        }
      } else {
        toast.error(result.error || "Failed to confirm disbursement");
      }
    } catch (error) {
      console.error("Error confirming disbursement:", error);
      toast.error("Failed to confirm disbursement. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  // Special Credit Approval Logic
  const handleCreditVerify = async () => {
    if (!localEligibleAmount.trim()) {
      toast.error(
        "Please supply the applicant's eligible amount before completing approval.",
      );
      return;
    }

    if (!selectedLoan) return;

    try {
      // First update the eligible amount
      const amountResult = await updateEligibleAmount(
        selectedLoan.id,
        localEligibleAmount,
        currentUser.id,
        currentUser.role,
      );

      if (!amountResult.success) {
        toast.error(amountResult.error || "Failed to update eligible amount.");
        return;
      }

      // Then proceed with workflow transition
      const result = await executeWorkflowTransition({
        submissionId: selectedLoan.id,
        currentStatus: selectedLoan.status,
        applicationType: "Loan",
        action: "approve",
        userRole: currentUser.role,
        userId: currentUser.id,
        eligibleAmount: localEligibleAmount,
        comment: `Credit assessment complete. Determined eligible amount: ${localEligibleAmount}. Moving to compliance audit.`,
      });

      if (result.success) {
        toast.success(result.message || "Credit verified and approved");
        // Refetch loans to update UI
        const { data, error } = await getSubmissionsByType("Loan");
        if (!error && data) {
          setLoanRequests(data);
          const updated = data.find(
            (r: ReviewRequest) => r.id === selectedLoan.id,
          );
          if (updated) setSelectedLoan(updated);
        }
      } else {
        toast.error(result.error || "Failed to complete credit verification");
      }
    } catch (error) {
      console.error("Error verifying credit:", error);
      toast.error("Failed to complete credit verification. Please try again.");
    }
  };

  const handleDeclineConfirm = async () => {
    if (!declineComment.trim()) return;
    if (!selectedLoan) return;

    const action = declineMode === "Return" ? "return" : "decline";

    try {
      setIsDeclining(true);
      const result = await executeWorkflowTransition({
        submissionId: selectedLoan.id,
        currentStatus: selectedLoan.status,
        applicationType: "Loan",
        action,
        userRole: currentUser.role,
        userId: currentUser.id,
        comment: declineComment,
      });

      if (result.success) {
        // Refetch loans to update UI
        const { data, error } = await getSubmissionsByType("Loan");
        if (!error && data) {
          setLoanRequests(data);
          const updated = data.find(
            (r: ReviewRequest) => r.id === selectedLoan.id,
          );
          if (updated) setSelectedLoan(updated);
        }
      } else {
        toast.error(result.error || "Failed to process action");
      }

      setIsDeclineModalOpen(false);
      setDeclineComment("");
      setIsDeclining(false);
    } catch (error) {
      console.error("Error processing decline/return:", error);
      toast.error("Failed to process action. Please try again.");
      setIsDeclining(false);
    }
  };

  const handleActionTrigger = (mode: "Decline" | "Return") => {
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
    readOnly = false,
  }: {
    label: string;
    value?: any;
    mono?: boolean;
    isSensitive?: boolean;
    isEditable?: boolean;
    onEdit?: (val: string) => void;
    options?: string[];
    readOnly?: boolean;
  }) => {
    const isVisible = !isSensitive || visibleFields.has(label);
    const displayValue =
      isSensitive && !isVisible
        ? "•••••••••••"
        : typeof value === "boolean"
          ? value
            ? "YES"
            : "NO"
          : value || "—";

    const shouldShowInput =
      !readOnly && !isSensitive && (isEditing || isEditable);

    return (
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {shouldShowInput ? (
            options ? (
              <select
                className="text-xs bg-slate-50 dark:bg-background-dark/50 border border-primary/20 rounded px-2 py-1 w-full font-bold uppercase tracking-wide text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                value={value}
                onChange={(e) => onEdit?.(e.target.value)}
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="text-xs bg-slate-50 dark:bg-background-dark/50 border border-primary/20 rounded px-2 py-1 w-full font-bold uppercase tracking-wide text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                value={value}
                onChange={(e) => onEdit?.(e.target.value)}
              />
            )
          ) : (
            <p
              className={`text-sm font-black ${mono ? "font-mono" : ""} ${label === "Application Source" && value === "RE-ASSIGNMENT" ? "text-indigo-500 animate-pulse" : "text-slate-900 dark:text-slate-100"} uppercase tracking-wide`}
            >
              {displayValue}
            </p>
          )}
          {isSensitive && (
            <button
              onClick={() => toggleVisibility(label)}
              className="text-slate-400 hover:text-primary transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isVisible ? "visibility_off" : "visibility"}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({
    title,
    children,
    icon,
    step,
    action,
  }: {
    title: string;
    children?: React.ReactNode;
    icon: string;
    step?: number;
    action?: React.ReactNode;
  }) => (
    <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px] font-black">
            {icon}
          </span>
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
            {title}
          </h5>
        </div>
        <div className="flex items-center gap-4">
          {action}
          {step !== undefined && (
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">
              Step {step}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const handleBackToList = () => {
    setSelectedLoan(null);
    onClearSelection?.();
    setIsEditing(false);
    setIsReassigning(false);
  };

  if (selectedLoan) {
    const loan = selectedLoan;
    const app = loan.applicant;

    const isLocked =
      loan.status === "Pending Disbursement" ||
      loan.status === "Approved" ||
      loan.status === "Declined";
    const isFinalized =
      loan.status === "Approved" || loan.status === "Declined";

    // Workflow-based permissions
    const canEdit = availableActions.includes("edit");
    const canReassign = availableActions.includes("reassign");
    const canApprove = availableActions.includes("approve");
    const canDecline = availableActions.includes("decline");
    const canReturn = availableActions.includes("return");

    // Special handling for Credit Check stage - need eligible amount before approval
    const isCreditStage =
      loan.status === "Internal Audit" && currentUser.role === "Credit";
    const canProceedWithCredit = isCreditStage
      ? canProceedFromCreditCheck(loan.eligibleAmount || localEligibleAmount)
      : true;

    const isIppisProduct = loan.loanProduct === "IPPIS";

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-black text-xs uppercase tracking-[0.2em]"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Return to List
          </button>
          <div className="flex items-center gap-3">
            {loan.status === "Approved" && (
              <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                Transaction Finalized
              </span>
            )}
            {loan.status === "Declined" && (
              <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  cancel
                </span>
                Transaction Rejected
              </span>
            )}
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all ${isEditing ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-surface-dark text-primary border-primary/20 hover:bg-primary/5"}`}
              >
                {isEditing ? "Save Changes" : "Edit Details"}
              </button>
            )}
            {canReassign && (
              <button
                onClick={handleOpenReassignModal}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  swap_horiz
                </span>
                Reassign Owner
              </button>
            )}
            {canReturn && (
              <button
                onClick={() => handleActionTrigger("Return")}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  undo
                </span>
                Return to Previous Node
              </button>
            )}
            {canApprove && !isCreditStage && (
              <button
                onClick={async () => {
                  if (loan.status === "Internal Audit") {
                    await handleAuditPass();
                  } else if (loan.status === "Pending Disbursement") {
                    await handleConfirmDisbursement();
                  } else {
                    // Generic approval for other stages
                    await handleAuditPass();
                  }
                }}
                disabled={isApproving}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  loan.status === "Pending Disbursement" && (
                    <span className="material-symbols-outlined text-[18px]">
                      payments
                    </span>
                  )
                )}
                {loan.status === "Pending Disbursement"
                  ? "Confirm Fund Disbursement"
                  : "Final Audit Pass"}
              </button>
            )}
            {isCreditStage && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 bg-primary/5 p-4 rounded-[20px] border border-primary/20">
                <div className="space-y-1 w-full sm:w-48">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Enter Eligible Amount
                  </p>
                  <input
                    type="text"
                    value={localEligibleAmount}
                    onChange={(e) => setLocalEligibleAmount(e.target.value)}
                    placeholder="e.g. ₦400,000"
                    className="w-full bg-white dark:bg-surface-dark border border-primary/30 rounded-xl px-3 py-2 text-xs font-black uppercase transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {canReturn && (
                    <button
                      onClick={() => handleActionTrigger("Return")}
                      className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all"
                    >
                      Return to Sales
                    </button>
                  )}
                  {canApprove && (
                    <button
                      onClick={handleCreditVerify}
                      disabled={!canProceedWithCredit}
                      className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all ${
                        canProceedWithCredit
                          ? "bg-primary hover:bg-blue-600 shadow-xl shadow-primary/30"
                          : "bg-slate-400 cursor-not-allowed"
                      }`}
                    >
                      Verify & Approve
                    </button>
                  )}
                </div>
              </div>
            )}
            {canDecline && (
              <button
                onClick={() => handleActionTrigger("Decline")}
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
              >
                Reject Loan
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm py-6 px-8 mb-8">
          <WorkflowStageIndicator
            currentStatus={loan.status}
            workflowType="Loan"
            userRole={currentUser.role}
          />
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <img
            src={app.avatar}
            className="w-24 h-24 rounded-[28px] border-4 border-slate-50 dark:border-slate-800 shadow-xl"
            alt=""
          />
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
              {app.title} {app.name}
            </h3>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
              {loan.referenceId} • {loan.loanProduct}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-slate-50 dark:bg-background-dark/50 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800 text-center md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                Principal Requested
              </p>
              <p className="text-3xl font-black text-primary tracking-tight">
                {loan.amount}
              </p>
            </div>
            {loan.eligibleAmount && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[24px] border border-emerald-100 dark:border-emerald-800/50 text-center md:text-right animate-in zoom-in-95">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">
                  Eligible Amount
                </p>
                <p className="text-3xl font-black text-emerald-500 tracking-tight">
                  {loan.eligibleAmount}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Section
            title="Internal Audit & Tracking"
            icon="fingerprint"
            step={0}
          >
            <Field label="Assigned To" value={localOwnerName} readOnly />
            <Field
              label="Referral Code Used"
              value={loan.referralCodeUsed}
              mono
              readOnly
            />
            <Field label="Application Source" value={localSource} readOnly />
          </Section>

          {/* Operation Log Section - GitHub Style Timeline */}
          <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px] font-black">
                  history
                </span>
                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                  Activity Timeline
                </h5>
              </div>
              {loan.operationLogs && loan.operationLogs.length > 0 && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {loan.operationLogs.length}{" "}
                  {loan.operationLogs.length === 1 ? "event" : "events"}
                </span>
              )}
            </div>
            <div className="relative">
              {/* Corrected: replaced 'inv' with 'loan' to fix the error */}
              {loan.operationLogs && loan.operationLogs.length > 0 ? (
                <div className="space-y-0">
                  {loan.operationLogs.map((log, index) => {
                    // Determine color based on action
                    let iconBg = "bg-slate-400";
                    let iconColor = "text-white";
                    let icon = "circle";

                    if (log.action.includes("APPROVED")) {
                      iconBg = "bg-emerald-500";
                      icon = "check_circle";
                    } else if (log.action.includes("DECLINED")) {
                      iconBg = "bg-rose-500";
                      icon = "cancel";
                    } else if (log.action.includes("RETURNED")) {
                      iconBg = "bg-amber-500";
                      icon = "undo";
                    } else if (log.action.includes("REASSIGNED")) {
                      iconBg = "bg-blue-500";
                      icon = "swap_horiz";
                    } else if (log.action.includes("ELIGIBLE")) {
                      iconBg = "bg-purple-500";
                      icon = "payments";
                    }

                    return (
                      <div
                        key={log.id}
                        className="relative flex gap-3 pb-6 group"
                      >
                        {/* Timeline line */}
                        {index !== loan.operationLogs!.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700" />
                        )}

                        {/* Icon */}
                        <div
                          className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shadow-sm`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${iconColor}`}
                          >
                            {icon}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {log.actor}
                              </span>
                              <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                                {log.action.toLowerCase().replace(/_/g, " ")}
                              </span>
                              {/* Status badges */}
                              {(log.fromStatus || log.toStatus) && (
                                <div className="flex items-center gap-2 mt-1">
                                  {log.fromStatus && (
                                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold">
                                      {log.fromStatus}
                                    </span>
                                  )}
                                  {log.fromStatus && log.toStatus && (
                                    <span className="text-slate-400">→</span>
                                  )}
                                  {log.toStatus && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                                      {log.toStatus}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {log.timestamp}
                            </span>
                          </div>

                          {log.comment && (
                            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                {log.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-4xl opacity-20">
                    history_edu
                  </span>
                  <p className="text-xs font-medium mt-2">
                    No activity recorded yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Eligible Amount Display (if exists) */}
          {loan.eligibleAmount && (
            <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    Eligible Principal Amount
                  </p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-tight">
                    {loan.eligibleAmount}
                  </p>
                </div>
                <span className="material-symbols-outlined text-emerald-500 text-3xl">
                  verified
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Form Fields */}
          <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px] font-black">
                  description
                </span>
                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                  Application Details
                </h5>
              </div>
            </div>
            <div className="space-y-4">
              {isLoadingFormData ? (
                <div className="text-center py-6 text-slate-400">
                  <span className="material-symbols-outlined text-4xl opacity-20 animate-spin">
                    progress_activity
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2">
                    Loading form details...
                  </p>
                </div>
              ) : formFields.length > 0 && formSubmission ? (
                formFields.map((field) => {
                  const value = formSubmission.field_responses[field.id];
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
                      <div className="text-sm text-slate-900 dark:text-white">
                        {field.field_type === "file" && value ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {field.label}
                            </p>
                            <div className="max-w-md aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                              <img
                                src={value}
                                alt={field.label}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
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
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <span className="material-symbols-outlined text-4xl opacity-20">
                    error
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2">
                    No form data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Modal */}
        {isDeclineModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {declineMode === "Decline"
                      ? "Reject Application"
                      : "Return to Previous Node"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 font-bold">
                    {declineMode === "Decline"
                      ? "Provide a reason for rejecting this loan request."
                      : "State what needs to be corrected by the previous team."}
                  </p>
                </div>
                <button
                  onClick={() => setIsDeclineModalOpen(false)}
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
                    value={declineComment}
                    onChange={(e) => setDeclineComment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white placeholder:text-slate-400"
                    placeholder="E.g. Insufficient income, negative credit history, incomplete documents..."
                    rows={4}
                  />
                  {!declineComment.trim() && (
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                      A comment is required to proceed.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsDeclineModalOpen(false)}
                  className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest"
                >
                  Discard
                </button>
                <button
                  onClick={handleDeclineConfirm}
                  disabled={!declineComment.trim() || isDeclining}
                  className={`px-8 py-4 text-white text-[10px] font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${declineMode === "Decline" ? "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600" : "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"}`}
                >
                  {isDeclining ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-sm">
                      {declineMode === "Decline" ? "cancel" : "undo"}
                    </span>
                  )}
                  Confirm {declineMode}
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
                        notified of this change. This action will be logged in
                        the operation history.
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
                  onClick={handleSaveReassignment}
                  disabled={
                    !selectedUserId || !reassignComment.trim() || isReassigning
                  }
                  className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-2xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isReassigning ? (
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
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Loans
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold">
            Comprehensive management of historical and ongoing loan
            transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-6 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">
              ios_share
            </span>
            {selectedIds.size > 0
              ? `Export Selected (${selectedIds.size})`
              : "Export Dataset"}
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
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
            <option>Request For Payment</option>
            <option>Disbursed</option>
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
                    checked={
                      filteredLoans.length > 0 &&
                      selectedIds.size === filteredLoans.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-5">Borrower</th>
                <th className="px-6 py-5">Reference</th>
                <th className="px-6 py-5">Product</th>
                <th className="px-6 py-5">Current Node</th>
                <th className="px-6 py-5">Sales Officer</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingLoans ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Loading Loans...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-[32px]">
                          folder_open
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                          No Loans Found
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((req) => {
                  const node = getApprovalNode(req.status);
                  const isChecked = selectedIds.has(req.id);
                  return (
                    <tr
                      key={req.id}
                      onClick={() => {
                        if (onSelectLoan) {
                          onSelectLoan(req.id);
                        } else {
                          setSelectedLoan(req);
                        }
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group ${isChecked ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    >
                      <td
                        className="px-6 py-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:bg-slate-700 text-primary focus:ring-primary cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(req.id)}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={req.applicant.avatar}
                            className="w-10 h-10 rounded-xl"
                            alt=""
                          />
                          <div>
                            <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wide group-hover:text-primary transition-colors">
                              {req.applicant.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500">
                              {req.applicant.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500">
                        {req.referenceId}
                      </td>
                      <td className="px-6 py-5 text-xs font-black uppercase text-slate-500">
                        {req.loanProduct || req.type}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${node.color}`}
                        >
                          {node.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {req.ownerName}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-primary">
                            {req.referralCodeUsed}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-slate-900 dark:text-white">
                        {req.amount}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-all">
                          chevron_right
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExportFieldsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        categories={LOAN_EXPORT_CATEGORIES}
      />
    </div>
  );
};

export default LoanView;
