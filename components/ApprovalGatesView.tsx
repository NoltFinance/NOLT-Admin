import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import {
  LOAN_WORKFLOW,
  INVESTMENT_WORKFLOW,
  WorkflowStage,
} from "../utils/workflowManager";
import { PERMISSIONS } from "../utils/rbac";
import { toast } from "sonner";
import {
  getApprovalGates,
  createApprovalGate,
  updateApprovalGate,
  deleteApprovalGate,
  ApprovalGate,
} from "../services/approvalGatesService";

// Predefined approval actions for gates
const APPROVAL_ACTIONS = {
  REVIEW_AND_VERIFICATION: [
    "Verify applicant information",
    "Review submitted documents",
    "Check application completeness",
    "Validate contact information",
    "Confirm eligibility criteria",
  ],
  DOCUMENT_VALIDATION: [
    "Verify identity documents",
    "Check customer information accuracy",
    "Validate government-issued ID",
    "Confirm proof of address",
    "Review document authenticity",
  ],
  CREDIT_ASSESSMENT: [
    "Assess creditworthiness",
    "Determine eligible loan amount",
    "Set repayment terms",
    "Review credit history",
    "Calculate debt-to-income ratio",
  ],
  COMPLIANCE_AND_AUDIT: [
    "Verify all documentation",
    "Check compliance with policies",
    "Validate credit decision",
    "Conduct compliance checks",
    "Review documentation completeness",
  ],
  PAYMENT_PROCESSING: [
    "Verify payment receipt",
    "Process payment to applicant",
    "Confirm fund transfer",
    "Update disbursement status",
    "Record transaction details",
  ],
  APPROVAL_DECISIONS: [
    "Approve to proceed",
    "Decline if invalid",
    "Approve or return to sales",
    "Approve or decline",
    "Approve for certificate issuance",
    "Approve for disbursement",
  ],
  CERTIFICATE_MANAGEMENT: [
    "Generate investment certificate",
    "Record investment details",
    "Send certificate to investor",
    "Complete investment record",
  ],
  GENERAL_ACTIONS: [
    "Add comments or notes",
    "Request additional information",
    "Escalate to supervisor",
    "Schedule follow-up",
    "Update application status",
  ],
} as const;

interface ApprovalGatesViewProps {
  currentUser: { name: string; role: UserRole; avatar: string };
}

interface GateConfig {
  id: string;
  name: string;
  description: string;
  workflowType: "Loan" | "Investment" | "Both";
  gatekeepers: UserRole[];
  order: number;
  stage: string;
  requiredActions: string[];
  specialConditions?: string;
}

const ApprovalGatesView: React.FC<ApprovalGatesViewProps> = ({
  currentUser,
}) => {
  const [gates, setGates] = useState<GateConfig[]>([]);
  const [selectedGate, setSelectedGate] = useState<GateConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Loan" | "Investment">(
    "All",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGate, setEditingGate] = useState<GateConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Supabase ApprovalGate to GateConfig
  const convertToGateConfig = (gate: ApprovalGate): GateConfig => ({
    id: gate.id,
    name: gate.name,
    description: gate.description,
    workflowType: gate.workflow_type,
    gatekeepers: gate.gatekeepers,
    order: gate.order,
    stage: gate.stage,
    requiredActions: gate.required_actions,
    specialConditions: gate.special_conditions,
  });

  // Convert GateConfig to Supabase ApprovalGate format
  const convertToApprovalGate = (
    gate: Omit<GateConfig, "id">,
  ): Omit<ApprovalGate, "id" | "created_at" | "updated_at"> => ({
    name: gate.name,
    description: gate.description,
    workflow_type: gate.workflowType,
    gatekeepers: gate.gatekeepers,
    order: gate.order,
    stage: gate.stage,
    required_actions: gate.requiredActions,
    special_conditions: gate.specialConditions,
  });

  useEffect(() => {
    loadGates();
  }, []);

  const loadGates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getApprovalGates();

      if (error) {
        toast.error("Failed to load approval gates");
        console.error("Error loading gates:", error);
      } else if (data) {
        const convertedGates = data.map(convertToGateConfig);
        setGates(convertedGates);
      }
    } catch (err) {
      toast.error("Unexpected error loading approval gates");
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGates = gates.filter((gate) => {
    const matchesSearch =
      gate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gate.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "All" ||
      gate.workflowType === filterType ||
      gate.workflowType === "Both";
    return matchesSearch && matchesType;
  });

  const getGateColor = (order: number) => {
    const colors = [
      "bg-blue-100 border-blue-300 text-blue-700",
      "bg-purple-100 border-purple-300 text-purple-700",
      "bg-indigo-100 border-indigo-300 text-indigo-700",
      "bg-violet-100 border-violet-300 text-violet-700",
      "bg-emerald-100 border-emerald-300 text-emerald-700",
    ];
    return colors[(order - 1) % colors.length];
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<string, string> = {
      "Sales Manager": "bg-blue-500",
      "Sales Officer": "bg-cyan-500",
      "Customer Experience": "bg-purple-500",
      Credit: "bg-indigo-500",
      "Internal Control": "bg-violet-500",
      Finance: "bg-emerald-500",
      "Super Admin": "bg-slate-800",
    };
    return colors[role] || "bg-slate-500";
  };

  const handleCreateGate = async (gateData: Omit<GateConfig, "id">) => {
    try {
      const approvalGate = convertToApprovalGate(gateData);
      const { data, error } = await createApprovalGate(approvalGate);

      if (error) {
        toast.error("Failed to create approval gate");
        console.error("Error creating gate:", error);
        return;
      }

      if (data) {
        const newGate = convertToGateConfig(data);
        setGates([...gates, newGate]);
        setIsCreateModalOpen(false);
        toast.success("Approval gate created successfully!");
      }
    } catch (err) {
      toast.error("Unexpected error creating approval gate");
      console.error("Unexpected error:", err);
    }
  };

  const handleUpdateGate = async (updatedGate: GateConfig) => {
    try {
      const { id, ...gateWithoutId } = updatedGate;
      const approvalGate = convertToApprovalGate(gateWithoutId);
      const { data, error } = await updateApprovalGate(id, approvalGate);

      if (error) {
        toast.error("Failed to update approval gate");
        console.error("Error updating gate:", error);
        return;
      }

      if (data) {
        const updated = convertToGateConfig(data);
        setGates(
          gates.map((gate) => (gate.id === updated.id ? updated : gate)),
        );
        setEditingGate(null);
        setIsEditMode(false);
        setSelectedGate(null);
        toast.success("Approval gate updated successfully!");
      }
    } catch (err) {
      toast.error("Unexpected error updating approval gate");
      console.error("Unexpected error:", err);
    }
  };

  const handleDeleteGate = async (gateId: string) => {
    if (!confirm("Are you sure you want to delete this approval gate?")) {
      return;
    }

    try {
      const { success, error } = await deleteApprovalGate(gateId);

      if (error) {
        toast.error("Failed to delete approval gate");
        console.error("Error deleting gate:", error);
        return;
      }

      if (success) {
        setGates(gates.filter((gate) => gate.id !== gateId));
        setSelectedGate(null);
        setEditingGate(null);
        setIsEditMode(false);
        toast.success("Approval gate deleted successfully!");
      }
    } catch (err) {
      toast.error("Unexpected error deleting approval gate");
      console.error("Unexpected error:", err);
    }
  };

  const openEditModal = (gate: GateConfig) => {
    setEditingGate(gate);
    setIsEditMode(true);
    setSelectedGate(null);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Approval Gates
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Sequential approval workflow configuration and gate management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {gates.length} Gates Active
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create Gate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search gates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["All", "Loan", "Investment"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-6 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                filterType === type
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Gates Grid */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse">
            <span className="material-symbols-outlined text-[32px] text-primary">
              hourglass_empty
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            Loading Approval Gates...
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please wait while we fetch the gate configurations
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGates.map((gate) => (
            <div
              key={gate.id}
              onClick={() => setSelectedGate(gate)}
              className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-all cursor-pointer group"
            >
              {/* Gate Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-xl ${getGateColor(gate.order)} flex items-center justify-center font-black text-lg border-2`}
                    >
                      {gate.order}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                        {gate.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {gate.stage}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {gate.description}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    gate.workflowType === "Loan"
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      : gate.workflowType === "Investment"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {gate.workflowType}
                </div>
              </div>

              {/* Gatekeepers */}
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Gatekeepers
                </p>
                <div className="flex flex-wrap gap-2">
                  {gate.gatekeepers.map((role) => (
                    <div
                      key={role}
                      className={`px-3 py-1.5 ${getRoleColor(role)} text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        shield_person
                      </span>
                      {role}
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Conditions */}
              {gate.specialConditions && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {gate.specialConditions}
                  </p>
                </div>
              )}

              {/* Required Actions Preview */}
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Required Actions ({gate.requiredActions.length})
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    check_circle
                  </span>
                  {gate.requiredActions[0]}
                  {gate.requiredActions.length > 1 && (
                    <span className="text-slate-400">
                      +{gate.requiredActions.length - 1} more
                    </span>
                  )}
                </div>
              </div>

              {/* Hover Arrow */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-black text-primary uppercase tracking-wider">
                  View Details
                </span>
                <span className="material-symbols-outlined text-primary text-[18px]">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredGates.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <span className="material-symbols-outlined text-[32px] text-slate-400">
              shield_lock
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            No Gates Found
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Gate Detail Modal */}
      {selectedGate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 px-8 py-6 rounded-t-[32px]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${getGateColor(selectedGate.order)} flex items-center justify-center font-black text-xl border-2`}
                  >
                    {selectedGate.order}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {selectedGate.name}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {selectedGate.stage}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGate(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => openEditModal(selectedGate)}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    edit
                  </span>
                  Edit Gate
                </button>
                <button
                  onClick={() => handleDeleteGate(selectedGate.id)}
                  className="px-4 py-3 bg-red-500 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-red-600 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    delete
                  </span>
                  Delete
                </button>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedGate.description}
                </p>
              </div>

              {/* Workflow Type */}
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Applies To
                </h3>
                <div
                  className={`inline-flex px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${
                    selectedGate.workflowType === "Loan"
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      : selectedGate.workflowType === "Investment"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {selectedGate.workflowType} Applications
                </div>
              </div>

              {/* Gatekeepers */}
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Authorized Gatekeepers
                </h3>
                <div className="space-y-2">
                  {selectedGate.gatekeepers.map((role) => (
                    <div
                      key={role}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      <div
                        className={`w-8 h-8 ${getRoleColor(role)} rounded-lg flex items-center justify-center`}
                      >
                        <span className="material-symbols-outlined text-white text-[18px]">
                          shield_person
                        </span>
                      </div>
                      <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                        {role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Conditions */}
              {selectedGate.specialConditions && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                    Special Requirements
                  </h3>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      {selectedGate.specialConditions}
                    </p>
                  </div>
                </div>
              )}

              {/* Required Actions */}
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Required Actions Checklist
                </h3>
                <div className="space-y-2">
                  {selectedGate.requiredActions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                        check_circle
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Gate Modal */}
      <GateFormModal
        isOpen={isCreateModalOpen || isEditMode}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditMode(false);
          setEditingGate(null);
        }}
        onSubmit={isEditMode ? handleUpdateGate : handleCreateGate}
        editingGate={editingGate}
        isEditMode={isEditMode}
      />
    </div>
  );
};

// Gate Form Modal Component
interface GateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (gate: any) => void;
  editingGate: GateConfig | null;
  isEditMode: boolean;
}

const GateFormModal: React.FC<GateFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingGate,
  isEditMode,
}) => {
  const [formData, setFormData] = useState<Omit<GateConfig, "id">>({
    name: "",
    description: "",
    workflowType: "Both",
    gatekeepers: [],
    order: 1,
    stage: "",
    requiredActions: [""],
    specialConditions: "",
  });

  const availableRoles: UserRole[] = [
    "Sales Manager",
    "Sales Officer",
    "Customer Experience",
    "Credit",
    "Internal Control",
    "Finance",
    "Super Admin",
  ];

  // Flatten all actions into a single array for selection
  const allAvailableActions = Object.values(APPROVAL_ACTIONS).flat();

  useEffect(() => {
    if (editingGate) {
      setFormData(editingGate);
    } else {
      setFormData({
        name: "",
        description: "",
        workflowType: "Both",
        gatekeepers: [],
        order: 1,
        stage: "",
        requiredActions: [""],
        specialConditions: "",
      });
    }
  }, [editingGate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.name ||
      !formData.description ||
      !formData.stage ||
      formData.gatekeepers.length === 0
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const filteredActions = formData.requiredActions.filter(
      (action) => action.trim() !== "",
    );

    if (filteredActions.length === 0) {
      alert("Please add at least one required action");
      return;
    }

    const gateData = {
      ...formData,
      requiredActions: filteredActions,
    };

    if (isEditMode && editingGate) {
      onSubmit({ ...gateData, id: editingGate.id });
    } else {
      onSubmit(gateData);
    }
  };

  const toggleGatekeeper = (role: UserRole) => {
    if (formData.gatekeepers.includes(role)) {
      setFormData({
        ...formData,
        gatekeepers: formData.gatekeepers.filter((r) => r !== role),
      });
    } else {
      setFormData({
        ...formData,
        gatekeepers: [...formData.gatekeepers, role],
      });
    }
  };

  const addRequiredAction = () => {
    setFormData({
      ...formData,
      requiredActions: [...formData.requiredActions, ""],
    });
  };

  const updateRequiredAction = (index: number, value: string) => {
    const updatedActions = [...formData.requiredActions];
    updatedActions[index] = value;
    setFormData({
      ...formData,
      requiredActions: updatedActions,
    });
  };

  const removeRequiredAction = (index: number) => {
    setFormData({
      ...formData,
      requiredActions: formData.requiredActions.filter((_, i) => i !== index),
    });
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<string, string> = {
      "Sales Manager": "bg-blue-500",
      "Sales Officer": "bg-cyan-500",
      "Customer Experience": "bg-purple-500",
      Credit: "bg-indigo-500",
      "Internal Control": "bg-violet-500",
      Finance: "bg-emerald-500",
      "Super Admin": "bg-slate-800",
    };
    return colors[role] || "bg-slate-500";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-dark rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 px-8 py-6 rounded-t-[32px] z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {isEditMode ? "Edit Approval Gate" : "Create Approval Gate"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {isEditMode
                  ? "Update gate configuration and requirements"
                  : "Configure a new approval gate for your workflow"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          {/* Gate Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Gate Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Gate 1: Submission Approval"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the purpose of this approval gate..."
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Order and Workflow Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Gate Order *
              </label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Workflow Type *
              </label>
              <select
                value={formData.workflowType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    workflowType: e.target.value as
                      | "Loan"
                      | "Investment"
                      | "Both",
                  })
                }
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                required
              >
                <option value="Both">Both</option>
                <option value="Loan">Loan Only</option>
                <option value="Investment">Investment Only</option>
              </select>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Workflow Stage *
            </label>
            <input
              type="text"
              value={formData.stage}
              onChange={(e) =>
                setFormData({ ...formData, stage: e.target.value })
              }
              placeholder="e.g., Submission → Customer Validation"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Gatekeepers */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Select Gatekeepers * (at least one)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleGatekeeper(role)}
                  className={`px-4 py-3 rounded-xl text-sm font-black uppercase tracking-tight transition-all flex items-center gap-2 ${
                    formData.gatekeepers.includes(role)
                      ? `${getRoleColor(role)} text-white shadow-lg`
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {formData.gatekeepers.includes(role)
                      ? "check_circle"
                      : "circle"}
                  </span>
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Required Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Required Actions * (select from predefined actions)
              </label>
              <button
                type="button"
                onClick={addRequiredAction}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                Add Action
              </button>
            </div>
            <div className="space-y-2">
              {formData.requiredActions.map((action, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={action}
                    onChange={(e) =>
                      updateRequiredAction(index, e.target.value)
                    }
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value="">Select an action...</option>
                    {Object.entries(APPROVAL_ACTIONS).map(
                      ([category, actions]) => (
                        <optgroup
                          key={category}
                          label={category.replace(/_/g, " ")}
                        >
                          {actions.map((actionOption) => (
                            <option key={actionOption} value={actionOption}>
                              {actionOption}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </select>
                  {formData.requiredActions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRequiredAction(index)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/40 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special Conditions */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Special Conditions (Optional)
            </label>
            <textarea
              value={formData.specialConditions || ""}
              onChange={(e) =>
                setFormData({ ...formData, specialConditions: e.target.value })
              }
              placeholder="e.g., ⚠️ Must specify eligible amount before approval"
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
            >
              {isEditMode ? "Update Gate" : "Create Gate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalGatesView;
