import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import {
  LOAN_WORKFLOW,
  INVESTMENT_WORKFLOW,
  WorkflowStage,
} from "../utils/workflowManager";
import { PERMISSIONS } from "../utils/rbac";

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

  useEffect(() => {
    // Initialize gates from workflow definitions
    loadGates();
  }, []);

  const loadGates = () => {
    const gateConfigs: GateConfig[] = [];

    // Gate 1: Sales Manager Approval
    gateConfigs.push({
      id: "gate-1",
      name: "Gate 1: Submission Approval",
      description: "Initial review and approval of submitted applications",
      workflowType: "Both",
      gatekeepers: ["Sales Manager", "Super Admin"],
      order: 1,
      stage: "Submission → Customer Validation",
      requiredActions: [
        "Verify applicant information",
        "Approve to proceed",
        "Decline if invalid",
      ],
    });

    // Gate 2: Customer Experience Approval
    gateConfigs.push({
      id: "gate-2",
      name: "Gate 2: Customer Validation",
      description: "Document verification and customer due diligence",
      workflowType: "Both",
      gatekeepers: ["Customer Experience", "Super Admin"],
      order: 2,
      stage: "Customer Validation → Next Stage",
      requiredActions: [
        "Verify identity documents",
        "Check customer information accuracy",
        "Approve or return to sales",
      ],
    });

    // Gate 3a: Credit Check (Loans Only)
    gateConfigs.push({
      id: "gate-3-credit",
      name: "Gate 3: Credit Check",
      description: "Credit assessment and eligibility determination",
      workflowType: "Loan",
      gatekeepers: ["Credit", "Super Admin"],
      order: 3,
      stage: "Credit Check → Request For Payment",
      requiredActions: [
        "Assess creditworthiness",
        "Determine eligible loan amount",
        "Set repayment terms",
        "Approve or decline",
      ],
      specialConditions: "⚠️ Must specify eligible amount before approval",
    });

    // Gate 3b: Internal Audit (Investments)
    gateConfigs.push({
      id: "gate-3-audit",
      name: "Gate 3: Payment Verification",
      description: "Compliance audit and payment confirmation",
      workflowType: "Investment",
      gatekeepers: ["Internal Control", "Super Admin"],
      order: 3,
      stage: "Payment Verification → Certificate Issued",
      requiredActions: [
        "Verify payment receipt",
        "Conduct compliance checks",
        "Review documentation completeness",
        "Approve for certificate issuance",
      ],
    });

    // Gate 4: Internal Control (Loans)
    gateConfigs.push({
      id: "gate-4-audit",
      name: "Gate 4: Compliance Audit",
      description: "Final compliance verification before disbursement",
      workflowType: "Loan",
      gatekeepers: ["Internal Control", "Super Admin"],
      order: 4,
      stage: "Request For Payment → Pending Disbursement",
      requiredActions: [
        "Verify all documentation",
        "Check compliance with policies",
        "Validate credit decision",
        "Approve for disbursement",
      ],
    });

    // Gate 5: Finance Disbursement (Loans)
    gateConfigs.push({
      id: "gate-5-finance-loan",
      name: "Gate 5: Fund Disbursement",
      description: "Final payment execution and loan disbursement",
      workflowType: "Loan",
      gatekeepers: ["Finance", "Super Admin"],
      order: 5,
      stage: "Pending Disbursement → Disbursed",
      requiredActions: [
        "Process payment to applicant",
        "Confirm fund transfer",
        "Update disbursement status",
        "Complete loan record",
      ],
    });

    // Gate 4: Finance Certificate (Investments)
    gateConfigs.push({
      id: "gate-4-finance-investment",
      name: "Gate 4: Certificate Issuance",
      description: "Final certificate generation and issuance",
      workflowType: "Investment",
      gatekeepers: ["Finance", "Super Admin"],
      order: 4,
      stage: "Certificate Processing → Certificate Issued",
      requiredActions: [
        "Generate investment certificate",
        "Record investment details",
        "Send certificate to investor",
        "Complete investment record",
      ],
    });

    setGates(gateConfigs);
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
      "Customer Experience": "bg-purple-500",
      Credit: "bg-indigo-500",
      "Internal Control": "bg-violet-500",
      Finance: "bg-emerald-500",
      "Super Admin": "bg-slate-800",
    };
    return colors[role] || "bg-slate-500";
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
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {gates.length} Gates Active
            </p>
          </div>
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

      {/* Empty State */}
      {filteredGates.length === 0 && (
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
    </div>
  );
};

export default ApprovalGatesView;
