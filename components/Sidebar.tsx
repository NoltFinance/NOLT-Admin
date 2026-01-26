import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserRole } from "../types";
import { canAccessView } from "../utils/rbac";

interface SidebarProps {
  onClose?: () => void;
  onLogoutClick: () => void;
  currentUser: { name: string; role: UserRole; avatar: string };
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  onLogoutClick,
  currentUser,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getViewFromPath = (path: string): string => {
    const pathMap: Record<string, string> = {
      "/": "dashboard",
      "/investments": "investments",
      "/loans": "loans",
      "/reports": "reports",
      "/queue": "queue",
      "/settings": "settings",
      "/users": "users",
      "/security": "security",
      "/form-builder": "form-builder",
      "/assigned-forms": "assigned-forms",
      "/approval-gates": "approval-gates",
    };
    return pathMap[path] || "dashboard";
  };

  const currentView = getViewFromPath(location.pathname);

  const NavLink = ({
    icon,
    label,
    to,
    view,
  }: {
    icon: string;
    label: string;
    to: string;
    view: string;
  }) => {
    const active = currentView === view;
    const hasAccess = canAccessView(currentUser.role, view as any);

    if (!hasAccess) {
      return (
        <div
          className="flex items-center w-full gap-3 px-4 py-3.5 rounded-xl opacity-30 cursor-not-allowed group"
          title="Access Restricted for your Role"
        >
          <span className="material-symbols-outlined text-[20px]">lock</span>
          <span className="text-sm font-black uppercase tracking-wider">
            {label}
          </span>
        </div>
      );
    }

    return (
      <Link
        to={to}
        onClick={onClose}
        className={`flex items-center w-full gap-3 px-4 py-3.5 rounded-xl transition-all group ${active
          ? "bg-primary text-white shadow-xl shadow-primary/20"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white"
          }`}
      >
        <span
          className={`material-symbols-outlined ${active ? "fill-1" : "group-hover:fill-1 transition-all"
            }`}
        >
          {icon}
        </span>
        <span className="text-sm font-black uppercase tracking-wider">
          {label}
        </span>
      </Link>
    );
  };

  const isSuperAdmin = currentUser.role === "Super Admin";

  const roles: UserRole[] = [
    "Super Admin",
    "Sales Manager",
    "Sales Team Lead",
    "Sales Officer",
    "Customer Experience",
    "Credit",
    "Internal Control",
    "Finance",
  ];

  return (
    <aside className="flex flex-col w-72 h-full border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark flex-shrink-0 transition-colors duration-300">
      <div className="p-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img
              src="https://isswlcllytiltgjbysjv.supabase.co/storage/v1/object/public/template-images/logo%20file-02%20(1).png"
              alt="NOLT Finance Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            NOLT Finance
          </h1>
        </Link>
        <button
          className="md:hidden text-slate-400 hover:text-rose-500"
          onClick={onClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="px-5 py-2 flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
            Management
          </p>
          <div className="space-y-1">
            <NavLink
              icon="dashboard"
              label="Dashboard"
              to="/"
              view="dashboard"
            />
            <NavLink
              icon="trending_up"
              label="Investments"
              to="/investments"
              view="investments"
            />
            <NavLink
              icon="credit_card"
              label="Loans"
              to="/loans"
              view="loans"
            />
            <NavLink
              icon="description"
              label="Reports"
              to="/reports"
              view="reports"
            />
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
            Core System
          </p>
          <div className="space-y-1">
            <NavLink
              icon="settings"
              label="Settings"
              to="/settings"
              view="settings"
            />
            <NavLink icon="group" label="Users" to="/users" view="users" />
            <NavLink
              icon="security"
              label="Audit Trail"
              to="/security"
              view="security"
            />
            <NavLink
              icon="dynamic_form"
              label="Form Designer"
              to="/form-builder"
              view="form-builder"
            />
            <NavLink
              icon="assignment"
              label="Assigned Forms"
              to="/assigned-forms"
              view="assigned-forms"
            />
            <NavLink
              icon="shield"
              label="Approval Gates"
              to="/approval-gates"
              view="approval-gates"
            />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {/* <div className="px-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
            Preview Role
          </label>
          <select
            className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-primary"
            value={currentUser.role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div> */}

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-slate-800/50 shadow-sm">
          <div
            className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 bg-cover bg-center ring-2 ring-white dark:ring-slate-800"
            style={{ backgroundImage: `url('${currentUser.avatar}')` }}
          ></div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">
              {currentUser.role}
            </span>
          </div>
          <button
            onClick={onLogoutClick}
            className="ml-auto w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-900/10 rounded-lg transition-all"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
