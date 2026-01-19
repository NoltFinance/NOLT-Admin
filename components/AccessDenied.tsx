import React from "react";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "Admin Access Restricted",
  message = "Access to this area is limited. Please contact your system lead for permissions.",
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20">
        <span className="material-symbols-outlined text-4xl font-black">
          lock_person
        </span>
      </div>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 font-bold max-w-md mt-2">
        {message}
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default AccessDenied;
