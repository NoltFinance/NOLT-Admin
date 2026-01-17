
import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Morgan',
    email: 'alex.m@nolt.finance',
    role: 'Super Admin',
    status: 'Active',
    referralCode: 'ALEX-ADMIN',
    lastActive: '2 mins ago',
    avatar: 'https://picsum.photos/seed/admin/100/100'
  },
  {
    id: 'u2',
    name: 'Tunde Bakare',
    email: 't.bakare@nolt.finance',
    role: 'Credit',
    status: 'Active',
    referralCode: 'CRED-T01',
    lastActive: '1 hour ago',
    avatar: 'https://picsum.photos/seed/tunde/100/100'
  },
  {
    id: 'u3',
    name: 'Michael Scott',
    email: 'scott@nolt.finance',
    role: 'Sales Team Lead',
    status: 'Active',
    referralCode: 'SALE-S99',
    lastActive: 'Yesterday',
    avatar: 'https://picsum.photos/seed/scott/100/100'
  },
  {
    id: 'u4',
    name: 'Jessica Wu',
    email: 'j.wu@nolt.finance',
    role: 'Customer Experience',
    status: 'Pending',
    referralCode: 'CX-JESS',
    lastActive: 'Never',
    avatar: 'https://picsum.photos/seed/jess/100/100'
  },
  {
    id: 'u5',
    name: 'Chidi Okoro',
    email: 'c.okoro@nolt.finance',
    role: 'Sales Officer',
    status: 'Active',
    referralCode: 'SO-CHIDI',
    lastActive: '10 mins ago',
    avatar: 'https://picsum.photos/seed/chidi/100/100',
    teamLeadId: 'u3'
  }
];

const ROLES: UserRole[] = ['Super Admin', 'Credit', 'Sales Manager', 'Sales Team Lead', 'Sales Officer', 'Customer Experience', 'Internal Control', 'Finance'];

const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingHierarchyId, setEditingHierarchyId] = useState<string | null>(null);

  // Form State for Invitation
  const [inviteRole, setInviteRole] = useState<UserRole>('Sales Officer');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.referralCode && u.referralCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const teamLeads = users.filter(u => u.role === 'Sales Team Lead');

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Suspended': return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  const handleStatusToggle = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === 'Active' || u.status === 'Pending' ? 'Suspended' : 'Active' };
      }
      return u;
    }));
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setEditingUser(null);
  };

  const handleTeamLeadChange = (userId: string, newLeadId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, teamLeadId: newLeadId || undefined } : u));
    setEditingHierarchyId(null);
  };

  const handleRegenerateCode = (userId: string) => {
    const newCode = `NOLT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, referralCode: newCode } : u));
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case 'Super Admin': return 'shield';
      case 'Credit': return 'account_balance';
      case 'Sales Manager': return 'leaderboard';
      case 'Sales Officer': return 'person_pin_circle';
      case 'Customer Experience': return 'support_agent';
      case 'Sales Team Lead': return 'groups';
      case 'Internal Control': return 'verified';
      default: return 'person';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Team & Role Management</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure administrative access, referral codes, and internal team hierarchy.</p>
        </div>
        <button 
          onClick={() => setIsInviteOpen(true)}
          className="px-8 py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all flex items-center gap-2 uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[22px]">person_add</span>
          Invite New User
        </button>
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full md:w-[480px]">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[22px]">search</span>
            </span>
            <input 
              type="text" 
              placeholder="Search by name, email or referral code..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-background-dark/50 border border-transparent dark:border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-primary text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.1em] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Administrator</th>
                <th className="px-8 py-5">Role & Permissions</th>
                <th className="px-8 py-5">Reports To</th>
                <th className="px-8 py-5">Referral Code</th>
                <th className="px-8 py-5">Account Status</th>
                <th className="px-8 py-5 text-right">Descriptive Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const manager = user.teamLeadId ? users.find(u => u.id === user.teamLeadId) : null;
                const otherUsers = users.filter(u => u.id !== user.id);
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-700 object-cover" alt="" />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors text-base">{user.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {editingUser?.id === user.id ? (
                        <select 
                          autoFocus
                          onBlur={() => setEditingUser(null)}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="bg-slate-50 dark:bg-background-dark border-none rounded-xl text-xs font-black py-2 px-3 focus:ring-2 focus:ring-primary"
                          defaultValue={user.role}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-primary">{getRoleIcon(user.role)}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{user.role}</span>
                          <button onClick={() => setEditingUser(user)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingHierarchyId === user.id ? (
                        <select 
                          autoFocus
                          onBlur={() => setEditingHierarchyId(null)}
                          onChange={(e) => handleTeamLeadChange(user.id, e.target.value)}
                          className="bg-slate-50 dark:bg-background-dark border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-2 focus:ring-primary w-full max-w-[160px]"
                          defaultValue={user.teamLeadId || ""}
                        >
                          <option value="">Global / None</option>
                          {otherUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 group/hierarchy">
                          {manager ? (
                            <div className="flex items-center gap-2">
                               <img src={manager.avatar} className="w-6 h-6 rounded-lg" alt="" />
                               <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{manager.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global / None</span>
                          )}
                          <button 
                            onClick={() => setEditingHierarchyId(user.id)}
                            className="opacity-0 group-hover:opacity-100 group-hover/hierarchy:opacity-100 text-slate-300 hover:text-primary transition-all ml-1"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <code className="bg-slate-100 dark:bg-background-dark px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600 dark:text-primary">
                          {user.referralCode || '—'}
                        </code>
                        <button onClick={() => handleRegenerateCode(user.id)} className="text-slate-400 hover:text-primary transition-colors" title="Regenerate Code">
                          <span className="material-symbols-outlined text-[18px]">refresh</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${getStatusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handleStatusToggle(user.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.15em] transition-all shadow-sm ${
                            user.status !== 'Suspended' 
                              ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20' 
                              : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {user.status !== 'Suspended' ? 'block' : 'check_circle'}
                          </span>
                          {user.status !== 'Suspended' ? 'REVOKE ACCESS' : 'ACTIVATE ACCOUNT'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Invite Team Member</h3>
                <p className="text-sm text-slate-500 mt-1">Assign roles and initial referral parameters.</p>
              </div>
              <button onClick={() => setIsInviteOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all" placeholder="Enter administrator name" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Work Email Address</label>
                <input type="email" className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all" placeholder="name@nolt.finance" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assign Role</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary font-bold"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Referral Code</label>
                  <input type="text" className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary uppercase font-mono font-bold" placeholder="NOLT-XXXX" />
                </div>
              </div>

              {inviteRole === 'Sales Officer' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-xs font-black text-primary uppercase tracking-widest">Assign Team Lead Oversight</label>
                  <select className="w-full bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary font-bold">
                    <option value="">Select a Team Lead...</option>
                    {teamLeads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.name} ({lead.email})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">The selected lead will have complete visibility over this officer's queue.</p>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsInviteOpen(false)} className="px-6 py-2 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider">Discard</button>
              <button onClick={() => setIsInviteOpen(false)} className="px-8 py-4 bg-primary text-white text-sm font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all uppercase tracking-widest">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
