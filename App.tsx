import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  ReviewRequest,
  StatMetric,
  AppNotification,
  UserRole,
  User,
} from "./types";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import ReviewQueue from "./components/ReviewQueue";
import QueueView from "./components/QueueView";
import InvestmentView from "./components/InvestmentView";
import LoanView from "./components/LoanView";
import SettingsView from "./components/SettingsView";
import UsersView from "./components/UsersView";
import AuditLogsView from "./components/AuditLogsView";
import FormBuilderView from "./components/FormBuilderView";
import NotificationPanel from "./components/NotificationPanel";
import LogoutModal from "./components/LogoutModal";
import AuthView from "./components/AuthView";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./components/AccessDenied";
import PublicFormsView from "./components/PublicFormsView";
import PublicFormSubmissionView from "./components/PublicFormSubmissionView";
import AssignedFormsView from "./components/AssignedFormsView";
import ApprovalGatesView from "./components/ApprovalGatesView";
import { getDashboardInsights } from "./services/geminiService";
import { getCurrentUser, signOut, AuthUser } from "./utils/authService";
import { canAccessView } from "./utils/rbac";
import {
  getAllSubmissionsAsRequests,
  getDashboardStats,
} from "./services/submissionsService";

// Real data will be fetched from the database
// Initial requests are now empty and will be populated on component mount

const USERS: User[] = [
  {
    id: "u1",
    name: "Alex Morgan",
    email: "alex.m@nolt.finance",
    role: "Super Admin",
    status: "Active",
    lastActive: "2 mins ago",
    avatar: "https://picsum.photos/seed/admin/100/100",
  },
  {
    id: "u3",
    name: "Michael Scott",
    role: "Sales Team Lead",
    email: "scott@nolt.finance",
    status: "Active",
    lastActive: "1 hr ago",
    avatar: "https://picsum.photos/seed/scott/100/100",
  },
  {
    id: "u5",
    name: "Chidi Okoro",
    role: "Sales Officer",
    email: "chidi@nolt.finance",
    status: "Active",
    lastActive: "10 mins ago",
    avatar: "https://picsum.photos/seed/chidi/100/100",
    teamLeadId: "u3",
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    type: "loan",
    title: "New Loan Request",
    message:
      "Sarah Miller submitted a Salary Advance application for ₦450,000.",
    timestamp: "2 mins ago",
    isRead: false,
    referenceId: "#LON-8822",
  },
];

const STATS: StatMetric[] = [
  {
    label: "Investment Applications",
    value: "142 Applications",
    subValue: "₦45,200,000.00",
    change: "+12.5%",
    isPositive: true,
    icon: "trending_up",
    color: "bg-blue-500 text-blue-500",
  },
  {
    label: "Loan Requests",
    value: "1,204 Applications",
    subValue: "₦12,840,000.00",
    change: "+5.0%",
    isPositive: true,
    icon: "payments",
    color: "bg-indigo-500 text-indigo-500",
  },
  {
    label: "Active Users",
    value: "842 Users",
    change: "+8.4%",
    isPositive: true,
    icon: "group",
    color: "bg-purple-500 text-purple-500",
  },
  {
    label: "Ongoing Applications",
    value: "56 Pending",
    badgeText: "High Priority",
    icon: "pending_actions",
    color: "bg-amber-500 text-amber-500",
  },
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuth") === "true";
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [stats, setStats] = useState<StatMetric[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem("isAuth", "true");
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("isAuth");
      }
    };

    if (isAuthenticated) {
      checkAuth();
    }
  }, []);

  // Fetch real data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      setIsLoadingData(true);
      try {
        // Fetch submissions
        const { data: submissions } = await getAllSubmissionsAsRequests();
        if (submissions) {
          setRequests(submissions);
        }

        // Fetch dashboard stats
        const statsData = await getDashboardStats();
        if (!statsData.error) {
          const newStats: StatMetric[] = [
            {
              label: "Investment Applications",
              value: `${statsData.investmentStats.count} Applications`,
              subValue: `₦${statsData.investmentStats.totalAmount.toLocaleString()}.00`,
              change: "+12.5%",
              isPositive: true,
              icon: "trending_up",
              color: "bg-blue-500 text-blue-500",
            },
            {
              label: "Loan Requests",
              value: `${statsData.loanStats.count} Applications`,
              subValue: `₦${statsData.loanStats.totalAmount.toLocaleString()}.00`,
              change: "+5.0%",
              isPositive: true,
              icon: "payments",
              color: "bg-indigo-500 text-indigo-500",
            },
            {
              label: "Total Submissions",
              value: `${submissions?.length || 0} Submissions`,
              change: "+8.4%",
              isPositive: true,
              icon: "group",
              color: "bg-purple-500 text-purple-500",
            },
            {
              label: "Pending Review",
              value: `${statsData.pendingCount} Pending`,
              badgeText: "High Priority",
              icon: "pending_actions",
              color: "bg-amber-500 text-amber-500",
            },
          ];
          setStats(newStats);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("isAuth", "true");
    navigate("/");
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("isAuth");
    setIsLogoutModalOpen(false);
    setSelectedRequestId(null);
    navigate("/login");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleGenerateInsights = async () => {
    setIsAnalyzing(true);
    const result = await getDashboardInsights(requests);
    setInsights(result);
    setIsAnalyzing(false);
  };

  const handleSelectRequest = (req: ReviewRequest) => {
    setSelectedRequestId(req.id);
    if (req.type === "Investment") {
      navigate("/investments");
    } else {
      navigate("/loans");
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleRoleChange = (role: UserRole) => {
    const roleProfiles: Record<UserRole, any> = {
      "Super Admin": {
        id: "u1",
        email: "alex.m@nolt.finance",
        name: "Alex Morgan",
        role: "Super Admin",
        avatar: "https://picsum.photos/seed/admin/100/100",
      },
      "Sales Manager": {
        id: "u_sm",
        email: "sarah.j@nolt.finance",
        name: "Sarah Jenkins",
        role: "Sales Manager",
        avatar: "https://picsum.photos/seed/sarahj/100/100",
      },
      "Sales Team Lead": {
        id: "u3",
        email: "scott@nolt.finance",
        name: "Michael Scott",
        role: "Sales Team Lead",
        avatar: "https://picsum.photos/seed/scott/100/100",
      },
      "Sales Officer": {
        id: "u5",
        email: "chidi@nolt.finance",
        name: "Chidi Okoro",
        role: "Sales Officer",
        avatar: "https://picsum.photos/seed/chidi/100/100",
      },
      "Customer Experience": {
        id: "u_cx",
        email: "jessica.w@nolt.finance",
        name: "Jessica Wu",
        role: "Customer Experience",
        avatar: "https://picsum.photos/seed/jess/100/100",
      },
      Credit: {
        id: "u_cm",
        email: "tunde.b@nolt.finance",
        name: "Tunde Bakare",
        role: "Credit",
        avatar: "https://picsum.photos/seed/tunde/100/100",
      },
      "Internal Control": {
        id: "u_ic",
        email: "femi.a@nolt.finance",
        name: "Femi Adekunle",
        role: "Internal Control",
        avatar: "https://picsum.photos/seed/femi/100/100",
      },
      Finance: {
        id: "u_fin",
        email: "hassan.b@nolt.finance",
        name: "Hassan Bello",
        role: "Finance",
        avatar: "https://picsum.photos/seed/hassan/100/100",
      },
    };
    const profile = roleProfiles[role];
    setCurrentUser(profile);
  };

  // Filter queue based on role rules
  const getVisibleQueue = () => {
    if (!currentUser) return [];

    if (
      currentUser.role === "Super Admin" ||
      currentUser.role === "Sales Manager" ||
      currentUser.role === "Internal Control" ||
      currentUser.role === "Customer Experience"
    ) {
      return requests;
    }

    if (currentUser.role === "Finance") {
      // Finance: Global Visibility on Payouts only
      return requests.filter(
        (r) => r.status === "Pending Disbursement" || r.status === "Approved",
      );
    }

    if (currentUser.role === "Credit") {
      return requests.filter(
        (r) =>
          r.type === "Loan" &&
          (r.status === "Docs Verification" ||
            r.status === "Pending Review" ||
            r.status === "Returned" ||
            r.status === "Internal Audit"),
      );
    }

    if (currentUser.role === "Sales Team Lead") {
      const subordinateIds = USERS.filter(
        (u) => u.teamLeadId === currentUser.id,
      ).map((u) => u.id);
      return requests.filter(
        (r) => r.ownerId && subordinateIds.includes(r.ownerId),
      );
    }

    if (currentUser.role === "Sales Officer") {
      return requests.filter((r) => r.ownerId === currentUser.id);
    }

    return [];
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, {currentUser?.name}
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold">
            Overview of financial metrics and system logs for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified_user
            </span>
            <span className="text-sm font-black text-primary uppercase tracking-wider">
              {currentUser?.role} View
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl transition-all shadow-lg border border-slate-700">
            <span className="material-symbols-outlined text-[20px]">
              download
            </span>
            <span className="text-xs font-black uppercase tracking-[0.1em]">
              Export Report
            </span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-primary/10 via-blue-500/5 to-transparent border border-primary/20 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0 w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40">
            <span className="material-symbols-outlined text-3xl animate-pulse">
              auto_awesome
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">
              AI Assistant Intelligence
            </h4>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base font-black">
              {isAnalyzing
                ? "Generating smart insights from current queue..."
                : insights ||
                  "Need a quick analysis? Let AI summarize the current review queue and identify trends."}
            </p>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-primary hover:bg-blue-600 text-white text-xs font-black rounded-2xl transition-all disabled:opacity-50 uppercase tracking-[0.15em] shadow-xl shadow-primary/20"
          >
            {isAnalyzing
              ? "Thinking..."
              : insights
                ? "Refresh Analysis"
                : "Generate Analysis"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingData ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Loading dashboard data...
              </p>
            </div>
          </div>
        ) : (
          stats.map((stat, idx) => <StatCard key={idx} stat={stat} />)
        )}
      </div>

      <ReviewQueue
        requests={getVisibleQueue()}
        onViewAll={() => navigate("/queue")}
        onSelectRequest={handleSelectRequest}
      />
    </div>
  );

  const UnderConstruction = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <span className="material-symbols-outlined text-6xl mb-4">
        construction
      </span>
      <h3 className="text-xl font-black uppercase">
        Screen Under Construction
      </h3>
      <p className="font-bold">We're working on this module.</p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest"
      >
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/forms" element={<PublicFormsView />} />
      <Route path="/apply/:formId" element={<PublicFormSubmissionView />} />

      <Route
        path="/login"
        element={
          isAuthenticated && currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <AuthView onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
          >
            <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
              {isSidebarOpen && (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              <div
                className={`fixed inset-y-0 left-0 z-50 transform ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}
              >
                <Sidebar
                  onClose={() => setIsSidebarOpen(false)}
                  onLogoutClick={() => setIsLogoutModalOpen(true)}
                  currentUser={currentUser!}
                  onRoleChange={handleRoleChange}
                />
              </div>

              <main className="flex-1 h-full overflow-y-auto bg-[#f8fafc] dark:bg-surface-darker relative flex flex-col transition-colors duration-300">
                <Header
                  onMenuClick={() => setIsSidebarOpen(true)}
                  onNotificationClick={() => setIsNotifPanelOpen(true)}
                  isDarkMode={isDarkMode}
                  onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                />

                <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full flex-1">
                  <Routes>
                    <Route path="/" element={renderDashboard()} />

                    <Route
                      path="/queue"
                      element={
                        <QueueView
                          requests={getVisibleQueue()}
                          onBack={() => navigate("/")}
                          onSelectRequest={handleSelectRequest}
                        />
                      }
                    />

                    <Route
                      path="/investments"
                      element={
                        currentUser?.role === "Credit" ? (
                          <AccessDenied
                            title="Access Restricted"
                            message="The Credit team scope is limited to Loan Records only. You do not have permissions to view Investment data."
                          />
                        ) : (
                          <InvestmentView
                            requests={requests}
                            onBack={() => navigate("/")}
                            selectedId={selectedRequestId}
                            onClearSelection={() => setSelectedRequestId(null)}
                            onSelectInvestment={(id) =>
                              setSelectedRequestId(id)
                            }
                            currentUser={currentUser!}
                          />
                        )
                      }
                    />

                    <Route
                      path="/loans"
                      element={
                        <LoanView
                          requests={requests}
                          onBack={() => navigate("/")}
                          selectedId={selectedRequestId}
                          onClearSelection={() => setSelectedRequestId(null)}
                          onSelectLoan={(id) => setSelectedRequestId(id)}
                          currentUser={currentUser!}
                        />
                      }
                    />

                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="settings"
                        >
                          <SettingsView />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="users"
                        >
                          <UsersView />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/security"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="security"
                        >
                          <AuditLogsView />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/form-builder"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="form-builder"
                        >
                          <FormBuilderView />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/assigned-forms"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="assigned-forms"
                        >
                          <AssignedFormsView currentUser={currentUser!} />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/approval-gates"
                      element={
                        <ProtectedRoute
                          currentUser={currentUser}
                          isAuthenticated={isAuthenticated}
                          requiredView="approval-gates"
                        >
                          <ApprovalGatesView currentUser={currentUser!} />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/reports" element={<UnderConstruction />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>

              <NotificationPanel
                isOpen={isNotifPanelOpen}
                onClose={() => setIsNotifPanelOpen(false)}
              />

              <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
              />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
