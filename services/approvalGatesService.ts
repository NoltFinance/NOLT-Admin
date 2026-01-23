import supabase from "../utils/supabase";
import { UserRole } from "../types";

export interface ApprovalGate {
  id: string;
  name: string;
  description: string;
  workflow_type: "Loan" | "Investment" | "Both";
  gatekeepers: UserRole[];
  order: number;
  stage: string;
  required_actions: string[];
  special_conditions?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all approval gates from Supabase
 */
export const getApprovalGates = async (): Promise<{
  data: ApprovalGate[] | null;
  error: any;
}> => {
  try {
    const { data, error } = await supabase
      .from("approval_gates")
      .select("*")
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching approval gates:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching approval gates:", err);
    return { data: null, error: err };
  }
};

/**
 * Create a new approval gate
 */
export const createApprovalGate = async (
  gate: Omit<ApprovalGate, "id" | "created_at" | "updated_at">,
): Promise<{
  data: ApprovalGate | null;
  error: any;
}> => {
  try {
    const { data, error } = await supabase
      .from("approval_gates")
      .insert([gate])
      .select()
      .single();

    if (error) {
      console.error("Error creating approval gate:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error creating approval gate:", err);
    return { data: null, error: err };
  }
};

/**
 * Update an existing approval gate
 */
export const updateApprovalGate = async (
  id: string,
  updates: Partial<Omit<ApprovalGate, "id" | "created_at" | "updated_at">>,
): Promise<{
  data: ApprovalGate | null;
  error: any;
}> => {
  try {
    const { data, error } = await supabase
      .from("approval_gates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating approval gate:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating approval gate:", err);
    return { data: null, error: err };
  }
};

/**
 * Delete an approval gate
 */
export const deleteApprovalGate = async (
  id: string,
): Promise<{
  success: boolean;
  error: any;
}> => {
  try {
    const { error } = await supabase
      .from("approval_gates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting approval gate:", error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error deleting approval gate:", err);
    return { success: false, error: err };
  }
};
