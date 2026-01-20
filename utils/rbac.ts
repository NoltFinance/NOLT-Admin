import { UserRole } from "../types";

// Define role hierarchy and permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  "Super Admin": 100,
  Credit: 80,
  "Internal Control": 75,
  Finance: 70,
  "Sales Manager": 60,
  "Sales Team Lead": 50,
  "Customer Experience": 40,
  "Sales Officer": 30,
};

// Admin roles that can access the admin dashboard
export const ADMIN_ROLES: UserRole[] = [
  "Super Admin",
  "Credit",
  "Internal Control",
  "Finance",
  "Sales Manager",
  "Sales Team Lead",
  "Sales Officer",
];

// Permissions mapping based on NOLT approval workflow
export const PERMISSIONS = {
  DASHBOARD: [
    "Super Admin",
    "Credit",
    "Internal Control",
    "Finance",
    "Sales Manager",
    "Sales Team Lead",
    "Sales Officer",
    "Customer Experience",
  ] as UserRole[],

  // Gate 1: Initial Review and Re-assignment
  APPROVE_GATE_1: ["Super Admin", "Sales Manager"] as UserRole[],

  // Gate 2: Document Vetting and Customer Validation
  APPROVE_GATE_2: ["Super Admin", "Customer Experience"] as UserRole[],

  // Credit Check (Loans Only) - Must supply Eligible Amount
  CREDIT_CHECK: ["Super Admin", "Credit"] as UserRole[],

  // Gate 3: Final Compliance Audit
  APPROVE_GATE_3: ["Super Admin", "Internal Control"] as UserRole[],

  // Execution Gate: Fund Movement Confirmation
  APPROVE_GATE_FINANCE: ["Super Admin", "Finance"] as UserRole[],

  // Re-assign ownership
  REASSIGN_OWNER: ["Super Admin", "Sales Manager"] as UserRole[],

  // Decline applications
  DECLINE_APPLICATION: [
    "Super Admin",
    "Sales Manager",
    "Customer Experience",
    "Credit",
    "Internal Control",
    "Finance",
  ] as UserRole[],

  // Return applications for rectification
  RETURN_APPLICATION: [
    "Super Admin",
    "Sales Manager",
    "Customer Experience",
    "Credit",
    "Internal Control",
  ] as UserRole[],

  VIEW_QUEUE: [
    "Super Admin",
    "Credit",
    "Internal Control",
    "Finance",
    "Sales Manager",
    "Sales Team Lead",
    "Customer Experience",
    "Sales Officer",
  ] as UserRole[],

  // View investments (All except Credit which is Loan-only)
  VIEW_INVESTMENTS: [
    "Super Admin",
    "Internal Control",
    "Finance",
    "Sales Manager",
    "Sales Team Lead",
    "Customer Experience",
    "Sales Officer",
  ] as UserRole[],

  // View loans (All roles)
  VIEW_LOANS: [
    "Super Admin",
    "Credit",
    "Internal Control",
    "Finance",
    "Sales Manager",
    "Sales Team Lead",
    "Customer Experience",
    "Sales Officer",
  ] as UserRole[],

  MANAGE_USERS: ["Super Admin"] as UserRole[],
  VIEW_SECURITY_LOGS: ["Super Admin", "Internal Control"] as UserRole[],
  MANAGE_SETTINGS: ["Super Admin"] as UserRole[],

  // Form Designer - Dynamic Field Configuration
  FORM_BUILDER: ["Super Admin"] as UserRole[],

  ASSIGNED_FORMS: [
    "Super Admin",
    "Credit",
    "Finance",
    "Internal Control",
    "Sales Manager",
    "Sales Team Lead",
    "Sales Officer",
    "Customer Experience",
  ] as UserRole[],

  EXPORT_DATA: [
    "Super Admin",
    "Credit",
    "Finance",
    "Internal Control",
    "Sales Manager",
  ] as UserRole[],
} as const;

/**
 * Check if a user role is an admin role
 */
export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if a user has permission for a specific action
 */
export function hasPermission(
  userRole: UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

/**
 * Check if a user role has higher or equal hierarchy than another role
 */
export function hasHigherOrEqualRole(
  userRole: UserRole,
  targetRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
}

/**
 * Check if user can approve at specific workflow gate
 */
export function canApproveAtGate(
  userRole: UserRole,
  gateNumber: 1 | 2 | 3 | "finance" | "credit",
): boolean {
  const gatePermissions = {
    1: "APPROVE_GATE_1",
    2: "APPROVE_GATE_2",
    3: "APPROVE_GATE_3",
    finance: "APPROVE_GATE_FINANCE",
    credit: "CREDIT_CHECK",
  } as const;

  const permission = gatePermissions[gateNumber];
  return PERMISSIONS[permission].includes(userRole);
}

/**
 * Check if user has global visibility or ownership-based
 */
export function hasGlobalVisibility(userRole: UserRole): boolean {
  const globalRoles: UserRole[] = [
    "Super Admin",
    "Sales Manager",
    "Customer Experience",
    "Internal Control",
    "Finance",
  ];
  return globalRoles.includes(userRole);
}

/**
 * Check if user can only see loan records (Credit team)
 */
export function isLoanOnlyRole(userRole: UserRole): boolean {
  return userRole === "Credit";
}

/**
 * Check if user has ownership-based visibility (Sales Staff)
 */
export function isOwnershipBased(userRole: UserRole): boolean {
  return userRole === "Sales Officer" || userRole === "Sales Team Lead";
}

/**
 * Get visibility scope description for role
 */
export function getVisibilityScopeDescription(userRole: UserRole): string {
  if (userRole === "Super Admin") return "Global (All Modules)";
  if (userRole === "Sales Manager") return "Global (All Modules)";
  if (userRole === "Customer Experience") return "Global (All Modules)";
  if (userRole === "Internal Control") return "Global (All Modules)";
  if (userRole === "Finance") return "Global (Audit Passed Only)";
  if (userRole === "Credit") return "Loan Records (Post-CX)";
  if (isOwnershipBased(userRole)) return "Ownership-based";
  return "Limited";
}

/**
 * Get allowed views based on user role
 */
export function getAllowedViews(userRole: UserRole): string[] {
  const views: string[] = [];

  if (hasPermission(userRole, "DASHBOARD")) {
    views.push("dashboard");
  }

  if (hasPermission(userRole, "VIEW_QUEUE")) {
    views.push("queue", "investments", "loans");
  }

  if (hasPermission(userRole, "MANAGE_USERS")) {
    views.push("users");
  }

  if (hasPermission(userRole, "VIEW_SECURITY_LOGS")) {
    views.push("security");
  }

  if (hasPermission(userRole, "MANAGE_SETTINGS")) {
    views.push("settings");
  }

  if (hasPermission(userRole, "FORM_BUILDER")) {
    views.push("form-builder", "reports");
  }

  if (hasPermission(userRole, "ASSIGNED_FORMS")) {
    views.push("assigned-forms");
  }

  // Approval gates view - accessible to all roles that can approve
  if (
    hasPermission(userRole, "DASHBOARD") ||
    hasPermission(userRole, "APPROVE_GATE_1") ||
    hasPermission(userRole, "APPROVE_GATE_2") ||
    hasPermission(userRole, "CREDIT_CHECK") ||
    hasPermission(userRole, "APPROVE_GATE_3") ||
    hasPermission(userRole, "APPROVE_GATE_FINANCE")
  ) {
    views.push("approval-gates");
  }

  return views;
}

/**
 * Validate if user can access a specific view
 */
export function canAccessView(userRole: UserRole, view: string): boolean {
  const allowedViews = getAllowedViews(userRole);
  return allowedViews.includes(view);
}
