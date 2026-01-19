import supabase from "./supabase";
import { UserRole } from "../types";
import { isAdminRole } from "./rbac";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  lastActive?: string;
}

/**
 * Sign in user with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{
  user: AuthUser | null;
  error: string | null;
  requiresOTP?: boolean;
}> {
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: "Authentication failed" };
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      // If profile doesn't exist, sign out and return error
      await supabase.auth.signOut();
      return { user: null, error: "User profile not found" };
    }

    // Check if user has admin role
    if (!isAdminRole(profile.role as UserRole)) {
      // Sign out non-admin users
      await supabase.auth.signOut();
      return {
        user: null,
        error: "Access denied. Admin privileges required.",
      };
    }

    // Check if user is active
    if (profile.status !== "Active") {
      await supabase.auth.signOut();
      return {
        user: null,
        error: `Account is ${profile.status.toLowerCase()}. Please contact administrator.`,
      };
    }

    // Update last active timestamp
    await supabase
      .from("users")
      .update({ lastActive: new Date().toISOString() })
      .eq("id", authData.user.id);

    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as UserRole,
      avatar: profile.avatar,
      lastActive: new Date().toISOString(),
    };

    return { user, error: null };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      user: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error || !profile) {
      return null;
    }

    // Verify admin role
    if (!isAdminRole(profile.role as UserRole)) {
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as UserRole,
      avatar: profile.avatar,
      lastActive: profile.lastActive,
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Sign up new user with email (sends OTP for verification)
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<{
  success: boolean;
  error: string | null;
  requiresOTP?: boolean;
}> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    console.log("SignUp metadata:", { name, role }); // Debug log
    console.log("Auth data:", authData); // Debug log

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Signup failed" };
    }

    // If email confirmation is required
    if (authData.user && !authData.session) {
      return {
        success: true,
        error: null,
        requiresOTP: true,
      };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Verify OTP for email confirmation or two-factor authentication
 */
export async function verifyOTP(
  email: string,
  token: string,
  type: "signup" | "email" | "magiclink" = "email",
): Promise<{
  success: boolean;
  user: AuthUser | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) {
      return { success: false, user: null, error: error.message };
    }

    if (!data.user) {
      return { success: false, user: null, error: "Verification failed" };
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        user: null,
        error: "User profile not found",
      };
    }

    // Check if user has admin role
    if (!isAdminRole(profile.role as UserRole)) {
      await supabase.auth.signOut();
      return {
        success: false,
        user: null,
        error: "Access denied. Admin privileges required.",
      };
    }

    // Update last active timestamp
    await supabase
      .from("users")
      .update({ lastActive: new Date().toISOString() })
      .eq("id", data.user.id);

    const user: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as UserRole,
      avatar: profile.avatar,
      lastActive: new Date().toISOString(),
    };

    return { success: true, user, error: null };
  } catch (error) {
    console.error("OTP verification error:", error);
    return {
      success: false,
      user: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Send OTP for two-factor authentication or magic link
 */
export async function sendOTP(
  email: string,
  options?: {
    shouldCreateUser?: boolean;
  },
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: options?.shouldCreateUser ?? false,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Sign in with magic link (passwordless)
 */
export async function signInWithMagicLink(email: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Check if user exists and has admin role
    const { data: profile } = await supabase
      .from("users")
      .select("role, status")
      .eq("email", email)
      .single();

    if (!profile) {
      return {
        success: false,
        error: "No account found with this email",
      };
    }

    if (!isAdminRole(profile.role as UserRole)) {
      return {
        success: false,
        error: "Access denied. Admin privileges required.",
      };
    }

    if (profile.status !== "Active") {
      return {
        success: false,
        error: `Account is ${profile.status.toLowerCase()}. Please contact administrator.`,
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Magic link error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Reset password - send reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Resend OTP verification code
 */
export async function resendOTP(
  email: string,
  type: "signup" | "email_change" = "signup",
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { error } = await supabase.auth.resend({
      type,
      email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Resend OTP error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create an admin user (Super Admin only)
 */
export async function createAdminUser(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  referralCode?: string;
}): Promise<{
  user: AuthUser | null;
  error: string | null;
}> {
  try {
    // Verify current user is Super Admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "Super Admin") {
      return {
        user: null,
        error: "Unauthorized. Only Super Admins can create admin users.",
      };
    }

    // Validate role is an admin role
    if (!isAdminRole(params.role)) {
      return {
        user: null,
        error: "Invalid role. Must be an admin role.",
      };
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: params.email,
        password: params.password,
        email_confirm: true, // Auto-confirm email for admin users
        user_metadata: {
          name: params.name,
        },
      });

    if (authError || !authData.user) {
      return {
        user: null,
        error: authError?.message || "Failed to create auth user",
      };
    }

    // Create user profile in database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email: params.email,
        name: params.name,
        role: params.role,
        status: "Active",
        referral_code:
          params.referralCode ||
          `${params.role.toUpperCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        avatar: `https://picsum.photos/seed/${authData.user.id}/100/100`,
        last_active: null,
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        user: null,
        error: profileError.message || "Failed to create user profile",
      };
    }

    const newUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as UserRole,
      avatar: profile.avatar,
    };

    return { user: newUser, error: null };
  } catch (error) {
    console.error("Create admin user error:", error);
    return {
      user: null,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth state changed:", event);

    if (!session?.user) {
      callback(null);
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile && isAdminRole(profile.role as UserRole)) {
      callback({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as UserRole,
        avatar: profile.avatar,
        lastActive: profile.lastActive,
      });
    } else {
      callback(null);
    }
  });

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Check if user session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error("Session check error:", error);
    return false;
  }
}

/**
 * Refresh current session
 */
export async function refreshSession(): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Refresh session error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get session metadata
 */
export async function getSessionMetadata(): Promise<{
  expiresAt: number | null;
  user: AuthUser | null;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { expiresAt: null, user: null };
    }

    const user = await getCurrentUser();
    return {
      expiresAt: session.expires_at || null,
      user,
    };
  } catch (error) {
    console.error("Get session metadata error:", error);
    return { expiresAt: null, user: null };
  }
}

/**
 * Change user email (requires verification)
 */
export async function changeEmail(newEmail: string): Promise<{
  success: boolean;
  error: string | null;
  requiresVerification?: boolean;
}> {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      error: null,
      requiresVerification: true,
    };
  } catch (error) {
    console.error("Change email error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
