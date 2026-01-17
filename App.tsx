
import React, { useState, useEffect } from 'react';
import { ReviewRequest, StatMetric, AppView, AppNotification, UserRole, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCard from './components/StatCard';
import ReviewQueue from './components/ReviewQueue';
import QueueView from './components/QueueView';
import InvestmentView from './components/InvestmentView';
import LoanView from './components/LoanView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import SecurityLogsView from './components/SecurityLogsView';
import FormBuilderView from './components/FormBuilderView';
import NotificationPanel from './components/NotificationPanel';
import LogoutModal from './components/LogoutModal';
import AuthView from './components/AuthView';
import { getDashboardInsights } from './services/geminiService';

const INITIAL_REQUESTS: ReviewRequest[] = [
  {
    id: '1',
    referenceId: '#INV-8821',
    type: 'Investment',
    amount: '₦2,500,000',
    targetAmount: '₦5,000,000',
    dateSubmitted: 'Oct 24, 2023',
    status: 'Pending Review',
    selectedPlan: 'NOLT Vault',
    tenure: '12 Months',
    rolloverOption: 'Principal & Interest',
    paymentStatus: 'PAID',
    ownerId: 'u5',
    ownerName: 'Chidi Okoro',
    referralCodeUsed: 'SO-CHIDI',
    transferReceiptUrl: 'https://placehold.co/400x600?text=Transfer+Receipt',
    governmentIdUrl: 'https://placehold.co/600x400?text=Government+ID',
    proofOfAddressUrl: 'https://placehold.co/600x400?text=Utility+Bill',
    applicant: {
      title: 'Mr',
      name: 'David Chen',
      email: 'david.c@example.com',
      avatar: 'https://picsum.photos/seed/david/100/100',
      isPep: true,
      gender: 'Male',
      dateOfBirth: '1985-03-15',
      mothersMaidenName: 'Rosemary',
      religion: 'Christianity',
      maritalStatus: 'Married',
      countryCode: '+234',
      phone: '9012345678',
      bvn: '22233344455',
      nin: '11122233344',
      stateOfOrigin: 'Lagos',
      stateOfResidence: 'Lagos',
      address: 'No 42, Victoria Island, Lagos',
      occupation: 'Business Executive',
      nokName: 'Linda Chen',
      nokRelationship: 'Spouse',
      nokAddress: 'No 42, Victoria Island, Lagos'
    }
  },
  {
    id: '2',
    referenceId: '#LON-8822',
    type: 'Loan',
    amount: '₦450,000',
    dateSubmitted: 'Oct 24, 2023',
    status: 'Pending Review',
    loanCategory: 'Employees',
    loanProduct: 'Salary Advance',
    repaymentPeriod: '6 Months',
    hasActiveLoans: false,
    monthlyIncome: '₦280,000',
    ownerId: 'u5',
    ownerName: 'Chidi Okoro',
    referralCodeUsed: 'SO-CHIDI',
    governmentIdUrl: 'https://placehold.co/600x400?text=Gov+ID',
    bankStatementUrl: 'https://placehold.co/600x400?text=Bank+Statement',
    proofOfAddressUrl: 'https://placehold.co/600x400?text=Utility+Bill',
    selfieUrl: 'https://placehold.co/400x400?text=Selfie',
    references: [
      { name: 'John Miller', phone: '08012345678', relationship: 'Family Member' },
      { name: 'Alice Smith', phone: '08123456789', relationship: 'Colleague' },
      { name: 'Peter Parker', phone: '09011223344', relationship: 'Friend' }
    ],
    applicant: {
      title: 'Mrs',
      name: 'Sarah Miller',
      email: 'sarah.m@example.com',
      avatar: 'https://picsum.photos/seed/sarah/100/100',
      isPep: false,
      gender: 'Female',
      dateOfBirth: '1992-07-22',
      mothersMaidenName: 'Elizabeth',
      religion: 'Christianity',
      maritalStatus: 'Married',
      countryCode: '+234',
      phone: '8123456789',
      bvn: '55566677788',
      nin: '99988877766',
      stateOfOrigin: 'Ogun',
      stateOfResidence: 'Lagos',
      address: '7, Admiralty Way, Lekki',
      occupation: 'Nurse',
      residentialStatus: 'Rent',
      dependents: 2
    }
  },
  {
    id: '3',
    referenceId: '#LON-9904',
    type: 'Loan',
    amount: '₦2,500,000',
    dateSubmitted: 'Oct 25, 2023',
    status: 'Returned',
    loanCategory: 'Business',
    loanProduct: 'Working Capital',
    repaymentPeriod: '12 Months',
    hasActiveLoans: true,
    monthlyIncome: '₦850,000',
    ownerId: 'u5',
    ownerName: 'Chidi Okoro',
    referralCodeUsed: 'SO-CHIDI',
    applicant: {
      title: 'Mr',
      name: 'Boluwatife Adeyemi',
      email: 'bolu.ade@techhub.ng',
      avatar: 'https://picsum.photos/seed/bolu/100/100',
      isPep: false,
      gender: 'Male',
      dateOfBirth: '1988-11-05',
      phone: '7034455667',
      address: 'Surulere, Lagos',
      occupation: 'Software Engineer'
    }
  },
  {
    id: '4',
    referenceId: '#INV-1021',
    type: 'Investment',
    amount: '₦10,000,000',
    targetAmount: '₦10,000,000',
    dateSubmitted: 'Oct 22, 2023',
    status: 'Approved',
    selectedPlan: 'NOLT Rise',
    tenure: '24 Months',
    rolloverOption: 'Payout',
    paymentStatus: 'VERIFIED',
    ownerId: 'u1',
    ownerName: 'Alex Morgan',
    referralCodeUsed: 'ALEX-ADMIN',
    applicant: {
      title: 'Dr',
      name: 'Emily Nwosu',
      email: 'e.nwosu@med.com',
      avatar: 'https://picsum.photos/seed/emily/100/100',
      isPep: false,
      gender: 'Female',
      dateOfBirth: '1975-04-12',
      phone: '8023344556',
      address: 'Maitama, Abuja',
      occupation: 'Medical Consultant'
    }
  },
  {
    id: '5',
    referenceId: '#LON-1105',
    type: 'Loan',
    amount: '₦1,200,000',
    dateSubmitted: 'Oct 26, 2023',
    status: 'Internal Audit',
    loanCategory: 'Employees',
    loanProduct: 'IPPIS',
    repaymentPeriod: '18 Months',
    hasActiveLoans: false,
    monthlyIncome: '₦400,000',
    ownerId: 'u5',
    ownerName: 'Chidi Okoro',
    referralCodeUsed: 'SO-CHIDI',
    applicant: {
      title: 'Ms',
      name: 'Chioma Okeke',
      email: 'c.okeke@lifestyle.ng',
      avatar: 'https://picsum.photos/seed/chioma/100/100',
      isPep: false,
      gender: 'Female',
      dateOfBirth: '1995-09-30',
      phone: '9051122334',
      address: 'Enugu, Nigeria',
      occupation: 'Civil Servant',
      ippisNumber: 'IP-9901223',
      mda: 'Federal Ministry of Health'
    }
  }
];

const USERS: User[] = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex.m@nolt.finance', role: 'Super Admin', status: 'Active', lastActive: '2 mins ago', avatar: 'https://picsum.photos/seed/admin/100/100' },
  { id: 'u3', name: 'Michael Scott', role: 'Sales Team Lead', email: 'scott@nolt.finance', status: 'Active', lastActive: '1 hr ago', avatar: 'https://picsum.photos/seed/scott/100/100' },
  { id: 'u5', name: 'Chidi Okoro', role: 'Sales Officer', email: 'chidi@nolt.finance', status: 'Active', lastActive: '10 mins ago', avatar: 'https://picsum.photos/seed/chidi/100/100', teamLeadId: 'u3' },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'loan',
    title: 'New Loan Request',
    message: 'Sarah Miller submitted a Salary Advance application for ₦450,000.',
    timestamp: '2 mins ago',
    isRead: false,
    referenceId: '#LON-8822'
  }
];

const STATS: StatMetric[] = [
  { 
    label: 'Investment Applications', 
    value: '142 Applications', 
    subValue: '₦45,200,000.00',
    change: '+12.5%', 
    isPositive: true, 
    icon: 'trending_up', 
    color: 'bg-blue-500 text-blue-500' 
  },
  { 
    label: 'Loan Requests', 
    value: '1,204 Applications', 
    subValue: '₦12,840,000.00',
    change: '+5.0%', 
    isPositive: true, 
    icon: 'payments', 
    color: 'bg-indigo-500 text-indigo-500' 
  },
  { 
    label: 'Active Users', 
    value: '842 Users', 
    change: '+8.4%', 
    isPositive: true, 
    icon: 'group', 
    color: 'bg-purple-500 text-purple-500' 
  },
  { 
    label: 'Ongoing Applications', 
    value: '56 Pending', 
    badgeText: 'High Priority',
    icon: 'pending_actions', 
    color: 'bg-amber-500 text-amber-500' 
  },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });
  
  const [currentUser, setCurrentUser] = useState<any>({
    id: 'u1',
    name: 'Alex Morgan',
    role: 'Super Admin' as UserRole,
    avatar: 'https://picsum.photos/seed/admin/100/100'
  });

  const [requests, setRequests] = useState<ReviewRequest[]>(INITIAL_REQUESTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuth');
    setIsLogoutModalOpen(false);
    setCurrentView('dashboard');
    setSelectedRequestId(null);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleGenerateInsights = async () => {
    setIsAnalyzing(true);
    const result = await getDashboardInsights(requests);
    setInsights(result);
    setIsAnalyzing(false);
  };

  const handleSelectRequest = (req: ReviewRequest) => {
    setSelectedRequestId(req.id);
    if (req.type === 'Investment') {
      setCurrentView('investments');
    } else {
      setCurrentView('loans');
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleNavigate = (view: AppView) => {
    // Navigation Guards
    const isCoreSystemView = ['settings', 'users', 'security', 'form-builder'].includes(view);
    if (isCoreSystemView && currentUser.role !== 'Super Admin') return;
    
    // Internal Control, Super Admin, and Finance have global visibility in their modules.
    if (currentUser.role === 'Credit' && view === 'investments') return;

    setCurrentView(view);
    setSelectedRequestId(null); 
  };

  const handleRoleChange = (role: UserRole) => {
    const roleProfiles: Record<UserRole, any> = {
      'Super Admin': { id: 'u1', name: 'Alex Morgan', role: 'Super Admin', avatar: 'https://picsum.photos/seed/admin/100/100' },
      'Sales Manager': { id: 'u_sm', name: 'Sarah Jenkins', role: 'Sales Manager', avatar: 'https://picsum.photos/seed/sarahj/100/100' },
      'Sales Team Lead': { id: 'u3', name: 'Michael Scott', role: 'Sales Team Lead', avatar: 'https://picsum.photos/seed/scott/100/100' },
      'Sales Officer': { id: 'u5', name: 'Chidi Okoro', role: 'Sales Officer', avatar: 'https://picsum.photos/seed/chidi/100/100' },
      'Customer Experience': { id: 'u_cx', name: 'Jessica Wu', role: 'Customer Experience', avatar: 'https://picsum.photos/seed/jess/100/100' },
      'Credit': { id: 'u_cm', name: 'Tunde Bakare', role: 'Credit', avatar: 'https://picsum.photos/seed/tunde/100/100' },
      'Internal Control': { id: 'u_ic', name: 'Femi Adekunle', role: 'Internal Control', avatar: 'https://picsum.photos/seed/femi/100/100' },
      'Finance': { id: 'u_fin', name: 'Hassan Bello', role: 'Finance', avatar: 'https://picsum.photos/seed/hassan/100/100' },
    };
    const profile = roleProfiles[role];
    setCurrentUser(profile);
    
    // Redirect if they were on a newly restricted view
    const isCoreSystemView = ['settings', 'users', 'security', 'form-builder'].includes(currentView);
    if (isCoreSystemView && role !== 'Super Admin') {
      setCurrentView('dashboard');
    }
    if (role === 'Credit' && currentView === 'investments') {
      setCurrentView('dashboard');
    }
  };

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  // Filter queue based on role rules
  const getVisibleQueue = () => {
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Sales Manager' || currentUser.role === 'Internal Control' || currentUser.role === 'Customer Experience') {
      return requests;
    }

    if (currentUser.role === 'Finance') {
      // Finance: Global Visibility on Payouts only
      return requests.filter(r => r.status === 'Pending Disbursement' || r.status === 'Approved');
    }

    if (currentUser.role === 'Credit') {
      return requests.filter(r => r.type === 'Loan' && (r.status === 'Docs Verification' || r.status === 'Pending Review' || r.status === 'Returned' || r.status === 'Internal Audit'));
    }

    if (currentUser.role === 'Sales Team Lead') {
      const subordinateIds = USERS.filter(u => u.teamLeadId === currentUser.id).map(u => u.id);
      return requests.filter(r => r.ownerId && subordinateIds.includes(r.ownerId));
    }

    if (currentUser.role === 'Sales Officer') {
      return requests.filter(r => r.ownerId === currentUser.id);
    }

    return [];
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, {currentUser.name}
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold">Overview of financial metrics and system logs for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <span className="text-sm font-black text-primary uppercase tracking-wider">{currentUser.role} View</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl transition-all shadow-lg border border-slate-700">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="text-xs font-black uppercase tracking-[0.1em]">Export Report</span>
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-primary/10 via-blue-500/5 to-transparent border border-primary/20 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0 w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40">
            <span className="material-symbols-outlined text-3xl animate-pulse">auto_awesome</span>
          </div>
          <div className="flex-1">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">AI Assistant Intelligence</h4>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base font-black">
              {isAnalyzing ? "Generating smart insights from current queue..." : (insights || "Need a quick analysis? Let AI summarize the current review queue and identify trends.")}
            </p>
          </div>
          <button 
            onClick={handleGenerateInsights}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-primary hover:bg-blue-600 text-white text-xs font-black rounded-2xl transition-all disabled:opacity-50 uppercase tracking-[0.15em] shadow-xl shadow-primary/20"
          >
            {isAnalyzing ? "Thinking..." : (insights ? "Refresh Analysis" : "Generate Analysis")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <StatCard key={idx} stat={stat} />
        ))}
      </div>

      <ReviewQueue 
        requests={getVisibleQueue()} 
        onViewAll={() => setCurrentView('queue')} 
        onSelectRequest={handleSelectRequest} 
      />
    </div>
  );

  const AccessRestrictedView = ({ title, message }: { title: string, message: string }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-[28px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20">
            <span className="material-symbols-outlined text-4xl font-black">lock_person</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-md mt-2">
            {message}
        </p>
        <button onClick={() => setCurrentView('dashboard')} className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">Back to Dashboard</button>
    </div>
  );

  const renderContent = () => {
    // Permission Checks
    const isCoreSystemView = ['settings', 'users', 'security', 'form-builder'].includes(currentView);
    if (isCoreSystemView && currentUser.role !== 'Super Admin') {
      return <AccessRestrictedView title="Admin Access Restricted" message="Access to the Core System area is limited to Super Administrators only. Please contact your system lead for permissions." />;
    }

    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'queue':
        return <QueueView requests={getVisibleQueue()} onBack={() => setCurrentView('dashboard')} onSelectRequest={handleSelectRequest} />;
      case 'investments':
        if (currentUser.role === 'Credit') {
            return <AccessRestrictedView title="Access Restricted" message="The Credit team scope is limited to Loan Records only. You do not have permissions to view Investment data." />;
        }
        return (
          <InvestmentView 
            requests={requests} 
            onBack={() => setCurrentView('dashboard')} 
            selectedId={selectedRequestId} 
            onClearSelection={() => setSelectedRequestId(null)} 
            currentUser={currentUser}
          />
        );
      case 'loans':
        return (
          <LoanView 
            requests={requests} 
            onBack={() => setCurrentView('dashboard')} 
            selectedId={selectedRequestId} 
            onClearSelection={() => setSelectedRequestId(null)} 
            currentUser={currentUser}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'users':
        return <UsersView />;
      case 'security':
        return <SecurityLogsView />;
      case 'form-builder':
        return <FormBuilderView />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">construction</span>
            <h3 className="text-xl font-black uppercase">Screen Under Construction</h3>
            <p className="font-bold">We're working on the {currentView} module.</p>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest"
            >
              Back to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          currentView={currentView}
          onNavigate={handleNavigate}
          onClose={() => setIsSidebarOpen(false)} 
          onLogoutClick={() => setIsLogoutModalOpen(true)}
          currentUser={currentUser}
          onRoleChange={handleRoleChange}
        />
      </div>

      <main className="flex-1 h-full overflow-y-auto bg-[#f8fafc] dark:bg-surface-darker relative flex flex-col transition-colors duration-300">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onNotificationClick={() => setIsNotifPanelOpen(true)}
          unreadCount={unreadCount}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />

        <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full flex-1">
          {renderContent()}
        </div>
      </main>

      <NotificationPanel 
        isOpen={isNotifPanelOpen}
        onClose={() => setIsNotifPanelOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllAsRead}
        onClearAll={clearNotifications}
      />

      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default App;
