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

// Permissions mapping
export const PERMISSIONS = {
  DASHBOARD: [
    "Super Admin",
    "Credit",
    "Internal Control",
    "Finance",
    "Sales Manager",
    "Sales Team Lead",
    "Sales Officer",
  ] as UserRole[],
  APPROVE_REQUESTS: [
    "Super Admin",
    "Credit",
    "Finance",
    "Sales Officer",
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
  MANAGE_USERS: ["Super Admin"] as UserRole[],
  VIEW_SECURITY_LOGS: ["Super Admin", "Internal Control"] as UserRole[],
  MANAGE_SETTINGS: ["Super Admin"] as UserRole[],
  FORM_BUILDER: ["Super Admin", "Credit", "Sales Officer"] as UserRole[],
  EXPORT_DATA: [
    "Super Admin",
    "Credit",
    "Finance",
    "Internal Control",
    "Sales Officer",
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
    views.push("form-builder");
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
