
import React from 'react';
import { AppView, UserRole } from '../types';

interface SidebarProps {
  onClose?: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogoutClick: () => void;
  currentUser: { name: string, role: UserRole, avatar: string };
  onRoleChange: (role: UserRole) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, currentView, onNavigate, onLogoutClick, currentUser, onRoleChange }) => {
  const NavLink = ({ icon, label, view, restricted = false }: { icon: string, label: string, view: AppView, restricted?: boolean }) => {
    const active = currentView === view;
    
    if (restricted) {
      return (
        <div 
          className="flex items-center w-full gap-3 px-4 py-3.5 rounded-xl opacity-30 cursor-not-allowed group"
          title="Access Restricted for your Role"
        >
          <span className="material-symbols-outlined text-[20px]">lock</span>
          <span className="text-sm font-black uppercase tracking-wider">{label}</span>
        </div>
      );
    }

    return (
      <button 
        onClick={() => {
          onNavigate(view);
          onClose?.();
        }}
        className={`flex items-center w-full gap-3 px-4 py-3.5 rounded-xl transition-all group ${
          active 
            ? 'bg-primary text-white shadow-xl shadow-primary/20' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span className={`material-symbols-outlined ${active ? 'fill-1' : 'group-hover:fill-1 transition-all'}`}>{icon}</span>
        <span className="text-sm font-black uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  const isSuperAdmin = currentUser.role === 'Super Admin';

  const roles: UserRole[] = ['Super Admin', 'Sales Manager', 'Sales Team Lead', 'Sales Officer', 'Customer Experience', 'Credit', 'Internal Control', 'Finance'];

  return (
    <aside className="flex flex-col w-72 h-full border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark flex-shrink-0 transition-colors duration-300">
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>account_balance_wallet</span>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">NOLT Finance</h1>
        </div>
        <button className="md:hidden text-slate-400 hover:text-rose-500" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="px-5 py-2 flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Management</p>
          <div className="space-y-1">
            <NavLink icon="dashboard" label="Dashboard" view="dashboard" />
            <NavLink 
                icon="trending_up" 
                label="Investments" 
                view="investments" 
                restricted={currentUser.role === 'Credit'} 
            />
            <NavLink icon="credit_card" label="Loans" view="loans" />
            <NavLink icon="description" label="Reports" view="reports" />
          </div>
        </div>

        <div>
          <p className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Core System</p>
          <div className="space-y-1">
            <NavLink icon="settings" label="Settings" view="settings" restricted={!isSuperAdmin} />
            <NavLink icon="group" label="Users" view="users" restricted={!isSuperAdmin} />
            <NavLink icon="security" label="Audit Trail" view="security" restricted={!isSuperAdmin} />
            <NavLink icon="dynamic_form" label="Form Designer" view="form-builder" restricted={!isSuperAdmin} />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="px-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Preview Role</label>
          <select 
            className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-primary"
            value={currentUser.role}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
          >
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-slate-800/50 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 bg-cover bg-center ring-2 ring-white dark:ring-slate-800" style={{ backgroundImage: `url('${currentUser.avatar}')` }}></div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{currentUser.name}</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{currentUser.role}</span>
          </div>
          <button 
            onClick={onLogoutClick}
            className="ml-auto w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-900/10 rounded-lg transition-all"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
