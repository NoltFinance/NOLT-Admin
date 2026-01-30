import React, { useState, useEffect } from "react";
import { RequestType, RequestStatus } from "../types";
import {
  getWorkflowStages,
  getCurrentStage,
  WorkflowStage,
} from "../utils/workflowManager";

interface WorkflowStageIndicatorProps {
  applicationType: RequestType;
  currentStatus: RequestStatus;
}

const WorkflowStageIndicator: React.FC<WorkflowStageIndicatorProps> = ({
  applicationType,
  currentStatus,
}) => {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [currentStageData, setCurrentStageData] =
    useState<WorkflowStage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStages = async () => {
      setIsLoading(true);
      try {
        const workflowStages = await getWorkflowStages(applicationType);
        const current = await getCurrentStage(currentStatus, applicationType);
        setStages(workflowStages);
        setCurrentStageData(current);
      } catch (err) {
        console.error("Error loading workflow stages:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStages();
  }, [applicationType, currentStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentIndex = stages.findIndex((s) => s.id === currentStageData?.id);

  const getStageStyle = (index: number) => {
    if (currentStatus === "Declined") {
      return index <= currentIndex
        ? "bg-rose-500 border-rose-500"
        : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600";
    }

    if (currentStatus === "Returned") {
      return "bg-orange-500 border-orange-500";
    }

    if (index < currentIndex) {
      return "bg-emerald-500 border-emerald-500";
    } else if (index === currentIndex) {
      return "bg-primary border-primary animate-pulse";
    } else {
      return "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600";
    }
  };

  const getConnectorStyle = (index: number) => {
    if (currentStatus === "Declined" || currentStatus === "Returned") {
      return index < currentIndex
        ? "bg-rose-500"
        : "bg-slate-200 dark:bg-slate-700";
    }

    return index < currentIndex
      ? "bg-emerald-500"
      : "bg-slate-200 dark:bg-slate-700";
  };

  if (currentStatus === "Declined") {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-rose-600 dark:text-rose-400">
            cancel
          </span>
          <div>
            <h4 className="font-black text-sm text-rose-900 dark:text-rose-100">
              Application Declined
            </h4>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
              This application was rejected at: {currentStageData?.label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStatus === "Returned") {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">
            undo
          </span>
          <div>
            <h4 className="font-black text-sm text-orange-900 dark:text-orange-100">
              Application Returned
            </h4>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
              Sent back for corrections and resubmission
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-100 dark:border-slate-800">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
          {applicationType} Application Progress
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
          Current Stage:{" "}
          <span className="text-primary">{currentStageData?.label}</span>
        </p>
      </div>

      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            {/* Stage Circle */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${getStageStyle(index)}`}
              >
                {index < currentIndex ? (
                  <span className="material-symbols-outlined text-white text-lg">
                    check
                  </span>
                ) : index === currentIndex ? (
                  <span className="text-white text-xs font-black">
                    {index + 1}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-black">
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="mt-2 text-center max-w-[80px]">
                <p
                  className={`text-[10px] font-black uppercase leading-tight ${index === currentIndex
                    ? "text-primary"
                    : index < currentIndex
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                    }`}
                >
                  {stage.label}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < stages.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 transition-all"
                style={{
                  backgroundColor:
                    getConnectorStyle(index) === "bg-emerald-500"
                      ? "rgb(16 185 129)"
                      : getConnectorStyle(index) === "bg-rose-500"
                        ? "rgb(244 63 94)"
                        : "rgb(226 232 240)",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current Stage Details */}
      {/* Current Stage Details - Removed description and gatekeepers, kept actions */}
      {currentStageData &&
        currentStageData.requiredActions &&
        currentStageData.requiredActions.length > 0 && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="mt-0 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                  warning
                </span>
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase mb-1">
                    Required Actions
                  </p>
                  <ul className="space-y-1">
                    {currentStageData.requiredActions.map((action, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-amber-700 dark:text-amber-300 font-bold"
                      >
                        • {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default WorkflowStageIndicator;
