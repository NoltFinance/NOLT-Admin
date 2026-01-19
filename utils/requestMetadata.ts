/**
 * Request Metadata Service
 * Captures and stores request context (IP, user agent) for audit logging
 */

import supabase from "./supabase";

/**
 * Get client IP address using external service
 */
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error("Error fetching IP address:", error);
    return null;
  }
}

/**
 * Set request metadata in database session for audit logging
 * Call this before any database operations that should capture IP/user agent
 */
export async function setRequestMetadata(): Promise<void> {
  try {
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    await supabase.rpc("set_request_metadata", {
      p_user_agent: userAgent,
      p_ip_address: ipAddress,
    });
  } catch (error) {
    // Don't throw - metadata is optional and shouldn't break operations
    console.warn("Failed to set request metadata for audit:", error);
  }
}

/**
 * Higher-order function to wrap database operations with metadata capture
 */
export function withAuditMetadata<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    await setRequestMetadata();
    return fn(...args);
  }) as T;
}
