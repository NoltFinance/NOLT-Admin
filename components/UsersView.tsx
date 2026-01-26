import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, UserRole, UserStatus } from "../types";
import {
  createAdminUser,
  fetchAllUsers,
  updateUserProfile,
  deleteUserProfile,
  getCurrentUser
} from "../utils/authService";

const ROLES: UserRole[] = [
  "Super Admin",
  "Credit",
  "Sales Manager",
  "Sales Team Lead",
  "Sales Officer",
  "Customer Experience",
  "Internal Control",
  "Finance",
];

const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingHierarchyId, setEditingHierarchyId] = useState<string | null>(null);

  // Form State for Invitation
  const [inviteRole, setInviteRole] = useState<UserRole>("Sales Officer");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteReferralCode, setInviteReferralCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Action Loading State
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setCurrentUserId(user.id);
      setCurrentUser(user as User);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const { users, error } = await fetchAllUsers();
    if (users) {
      setUsers(users);
    } else {
      console.error("Failed to load users:", error);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.referralCode &&
        u.referralCode.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const teamLeads = users.filter((u) => u.role === "Sales Team Lead");

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "Pending":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "Suspended":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    setActionLoading(user.id);

    const { success, error } = await updateUserProfile(user.id, { status: newStatus });

    if (success) {
      await loadUsers();
      toast.success(`User status updated to ${newStatus}`);
    } else {
      toast.error(`Failed to update status: ${error}`);
    }
    setActionLoading(null);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    const { success, error } = await updateUserProfile(userId, { role: newRole });

    if (success) {
      await loadUsers();
      setEditingUser(null);
      toast.success("User role updated successfully");
    } else {
      toast.error(`Failed to update role: ${error}`);
    }
    setActionLoading(null);
  };

  const handleTeamLeadChange = async (userId: string, newLeadId: string) => {
    setActionLoading(userId);
    const { success, error } = await updateUserProfile(userId, { teamLeadId: newLeadId || undefined });

    if (success) {
      await loadUsers();
      setEditingHierarchyId(null);
      toast.success("Team Lead updated successfully");
    } else {
      toast.error(`Failed to update team lead: ${error}`);
    }
    setActionLoading(null);
  };

  const handleRegenerateCode = async (userId: string) => {
    const newCode = `NOLT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setActionLoading(userId);

    const { success, error } = await updateUserProfile(userId, { referralCode: newCode });

    if (success) {
      await loadUsers();
      toast.success("Referral code regenerated");
    } else {
      toast.error(`Failed to update referral code: ${error}`);
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (user: User) => {
    toast("Are you sure?", {
      description: `You are about to delete ${user.name}. This cannot be undone.`,
      action: {
        label: "Delete",
        onClick: async () => {
          setActionLoading(user.id);
          const { success, error } = await deleteUserProfile(user.id);

          if (success) {
            await loadUsers();
            toast.success(`User ${user.name} deleted`);
          } else {
            toast.error(`Failed to delete user: ${error}`);
          }
          setActionLoading(null);
        },
      },
      cancel: {
        label: "Cancel",
      },
      duration: 5000,
    });
  };

  const handleCreateUser = async () => {
    setCreateError(null);
    setCreateSuccess(false);

    // Validate form
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      setCreateError("Please fill in all required fields");
      return;
    }

    setIsCreating(true);

    try {
      const { user, error } = await createAdminUser({
        email: inviteEmail,
        password: invitePassword,
        name: inviteName,
        role: inviteRole,
        referralCode: inviteReferralCode || undefined,
      });

      if (error) {
        setCreateError(error);
        setIsCreating(false);
        return;
      }

      if (user) {
        await loadUsers();

        // Reset form and close modal
        setCreateSuccess(true);
        setTimeout(() => {
          setIsInviteOpen(false);
          setInviteName("");
          setInviteEmail("");
          setInvitePassword("");
          setInviteReferralCode("");
          setInviteRole("Sales Officer");
          setCreateSuccess(false);
        }, 1500);

        toast.success("User created successfully");
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create user",
      );
      toast.error("Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "Super Admin": return "shield";
      case "Credit": return "account_balance";
      case "Sales Manager": return "leaderboard";
      case "Sales Officer": return "person_pin_circle";
      case "Customer Experience": return "support_agent";
      case "Sales Team Lead": return "groups";
      case "Internal Control": return "verified";
      default: return "person";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Team & Role Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure administrative access, referral codes, and internal team
            hierarchy.
          </p>
        </div>
        {currentUser?.role === "Super Admin" && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="w-full md:w-auto px-8 py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[22px]">
              person_add
            </span>
            Invite New User
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full md:w-[480px]">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[22px]">
                search
              </span>
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

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.1em] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Administrator</th>
                <th className="px-8 py-5">Role & Permissions</th>
                <th className="px-8 py-5">Reports To</th>
                <th className="px-8 py-5">Referral Code</th>
                <th className="px-8 py-5">Account Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const manager = user.teamLeadId
                  ? users.find((u) => u.id === user.teamLeadId)
                  : null;
                const otherUsers = users.filter((u) => u.id !== user.id);
                const isProcessing = actionLoading === user.id;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatar}
                          className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-700 object-cover"
                          alt=""
                        />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors text-base">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {editingUser?.id === user.id ? (
                        <select
                          autoFocus
                          onBlur={() => setEditingUser(null)}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as UserRole,
                            )
                          }
                          className="bg-slate-50 dark:bg-background-dark border-none rounded-xl text-xs font-black py-2 px-3 focus:ring-2 focus:ring-primary"
                          defaultValue={user.role}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-primary">
                            {getRoleIcon(user.role)}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {user.role}
                          </span>
                          {currentUserId !== user.id && (
                            <button
                              onClick={() => setEditingUser(user)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingHierarchyId === user.id ? (
                        <select
                          autoFocus
                          onBlur={() => setEditingHierarchyId(null)}
                          onChange={(e) =>
                            handleTeamLeadChange(user.id, e.target.value)
                          }
                          className="bg-slate-50 dark:bg-background-dark border-none rounded-xl text-[10px] font-black uppercase py-2 px-3 focus:ring-2 focus:ring-primary w-full max-w-[160px]"
                          defaultValue={user.teamLeadId || ""}
                        >
                          <option value="">Global / None</option>
                          {otherUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 group/hierarchy">
                          {manager ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={manager.avatar}
                                className="w-6 h-6 rounded-lg"
                                alt=""
                              />
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                {manager.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                              Global / None
                            </span>
                          )}
                          <button
                            onClick={() => setEditingHierarchyId(user.id)}
                            className="opacity-0 group-hover:opacity-100 group-hover/hierarchy:opacity-100 text-slate-300 hover:text-primary transition-all ml-1"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <code className="bg-slate-100 dark:bg-background-dark px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600 dark:text-primary">
                          {user.referralCode || "—"}
                        </code>
                        <button
                          onClick={() => handleRegenerateCode(user.id)}
                          className="text-slate-400 hover:text-primary transition-colors"
                          title="Regenerate Code"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            refresh
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${getStatusBadge(user.status)}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Action Button */}
                        {user.status === "Pending" && (
                          <button
                            onClick={() => handleStatusChange(user, "Active")}
                            title="Activate User"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.1em] transition-all shadow-sm text-white bg-primary hover:bg-blue-600 shadow-primary/20"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              check_circle
                            </span>
                            ACTIVATE
                          </button>
                        )}

                        {user.status === "Active" && (
                          <button
                            onClick={() => handleStatusChange(user, "Suspended")}
                            title="Suspend User"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.1em] transition-all shadow-sm text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              block
                            </span>
                            SUSPEND
                          </button>
                        )}

                        {user.status === "Suspended" && (
                          <button
                            onClick={() => handleStatusChange(user, "Active")}
                            title="Reactivate User"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.1em] transition-all shadow-sm text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              history
                            </span>
                            UNSUSPEND
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteUser(user)}
                          title="Delete User"
                          className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white transition-all ml-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredUsers.map((user) => {
            const manager = user.teamLeadId
              ? users.find((u) => u.id === user.teamLeadId)
              : null;
            return (
              <div
                key={user.id}
                className="p-5 flex flex-col gap-4 bg-white dark:bg-surface-dark"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      className="w-12 h-12 rounded-2xl border-2 border-slate-100 dark:border-slate-700 object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${getStatusBadge(user.status)}`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Role
                    </p>
                    {editingUser?.id === user.id ? (
                      <select
                        autoFocus
                        onBlur={() => setEditingUser(null)}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        className="bg-slate-50 dark:bg-background-dark border-none rounded-xl text-xs font-black py-2 px-3 focus:ring-2 focus:ring-primary w-full"
                        defaultValue={user.role}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {getRoleIcon(user.role)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {user.role}
                        </span>
                        {currentUserId !== user.id && (
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-slate-300 hover:text-primary transition-all ml-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              edit
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Referral Code
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 dark:bg-background-dark px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600 dark:text-primary">
                        {user.referralCode || "—"}
                      </code>
                      <button
                        onClick={() => handleRegenerateCode(user.id)}
                        className="text-slate-400 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          refresh
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {manager ? (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={manager.avatar}
                          className="w-5 h-5 rounded-md"
                          alt=""
                        />
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                          {manager.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Global
                      </span>
                    )}
                    <button
                      onClick={() => setEditingHierarchyId(user.id)}
                      className="text-slate-300 hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        edit
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.status === "Pending" && (
                      <button
                        onClick={() => handleStatusChange(user, "Active")}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        title="Activate"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          check
                        </span>
                      </button>
                    )}
                    {user.status === "Active" && (
                      <button
                        onClick={() => handleStatusChange(user, "Suspended")}
                        className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors"
                        title="Suspend"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          block
                        </span>
                      </button>
                    )}
                    {user.status === "Suspended" && (
                      <button
                        onClick={() => handleStatusChange(user, "Active")}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        title="Reactivate"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          history
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {
        isInviteOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-surface-dark z-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Invite Team Member
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Assign roles and initial referral parameters.
                  </p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-8 space-y-6">
                {createError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-rose-500">
                        error
                      </span>
                      <p className="text-sm text-rose-600 font-bold">
                        {createError}
                      </p>
                    </div>
                  </div>
                )}
                {createSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-emerald-500">
                        check_circle
                      </span>
                      <p className="text-sm text-emerald-600 font-bold">
                        User created successfully!
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Enter administrator name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all"
                    placeholder="name@nolt.finance"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Minimum 8 characters"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                    User will be able to change this after first login
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Assign Role
                    </label>
                    <select
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary font-bold"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      disabled={isCreating}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Referral Code (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary uppercase font-mono font-bold"
                      placeholder="AUTO-GENERATED"
                      value={inviteReferralCode}
                      onChange={(e) =>
                        setInviteReferralCode(e.target.value.toUpperCase())
                      }
                      disabled={isCreating}
                    />
                  </div>
                </div>

                {inviteRole === "Sales Officer" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-xs font-black text-primary uppercase tracking-widest">
                      Assign Team Lead Oversight
                    </label>
                    <select className="w-full bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary font-bold">
                      <option value="">Select a Team Lead...</option>
                      {teamLeads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} ({lead.email})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      The selected lead will have complete visibility over this
                      officer's queue.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 dark:bg-background-dark/30 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setInviteName("");
                    setInviteEmail("");
                    setInvitePassword("");
                    setInviteReferralCode("");
                    setCreateError(null);
                    setCreateSuccess(false);
                  }}
                  className="px-6 py-2 text-sm font-black text-slate-500 hover:text-slate-800 uppercase tracking-wider"
                  disabled={isCreating}
                >
                  Discard
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-8 py-4 bg-primary text-white text-sm font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default UsersView;
