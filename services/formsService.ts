import supabase from "../utils/supabase";
import { CustomForm, FormField, FormSubmission } from "../types";

/**
 * AUDIT LOGGING NOTE:
 * For proper IP address and user agent capture in audit logs,
 * call setRequestMetadata() before any write operations:
 *
 * import { setRequestMetadata } from "../utils/requestMetadata";
 * await setRequestMetadata();
 * await createForm(...);
 */

/**
 * Fetch all forms with optional filters
 */
export async function getForms(filters?: {
  type?: string;
  status?: string;
  category_type?: string;
  visibility?: string;
}): Promise<{ data: CustomForm[] | null; error: string | null }> {
  try {
    let query = supabase
      .from("forms")
      .select("*, form_fields(*)")
      .order("updated_at", { ascending: false });

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.category_type) {
      query = query.eq("category_type", filters.category_type);
    }
    if (filters?.visibility) {
      query = query.eq("visibility", filters.visibility);
    }

    const { data, error } = await query;

    console.log("getForms - Raw data:", data?.length, "forms");
    console.log("getForms - Error:", error);

    if (error) {
      console.error("Error fetching forms:", error);
      return { data: null, error: error.message };
    }

    // Transform the data to match CustomForm interface
    const forms: CustomForm[] = (data || []).map((form: any) => ({
      id: form.id,
      name: form.name,
      type: form.type,
      category_type: form.category_type,
      status: form.status,
      visibility: form.visibility,
      description: form.description,
      administrators: form.administrators,
      created_by: form.created_by,
      created_at: form.created_at,
      updated_at: form.updated_at,
      published_at: form.published_at,
      version: form.version,
      enable_steps: form.enable_steps,
      step_labels: form.step_labels,
      fields: (form.form_fields || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((field: any) => ({
          id: field.id,
          form_id: field.form_id,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          validation_rules: field.validation_rules,
          order_index: field.order_index,
          step_number: field.step_number,
          created_at: field.created_at,
          updated_at: field.updated_at,
        })),
    }));

    return { data: forms, error: null };
  } catch (err) {
    console.error("Unexpected error fetching forms:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch forms",
    };
  }
}

/**
 * Fetch public forms (no authentication required)
 * This function is specifically for the public-facing forms page
 */
export async function getPublicForms(): Promise<{
  data: CustomForm[] | null;
  error: string | null;
}> {
  try {
    console.log("Fetching public forms...");

    // Use select with specific columns to avoid RLS issues
    const { data, error } = await supabase
      .from("forms")
      .select(
        `
        id,
        name,
        type,
        category_type,
        status,
        visibility,
        description,
        created_at,
        updated_at,
        enable_steps,
        step_labels,
        form_fields (
          id,
          form_id,
          field_type,
          label,
          placeholder,
          required,
          options,
          order_index,
          step_number
        )
      `,
      )
      .eq("status", "Published")
      .eq("visibility", "Public")
      .order("updated_at", { ascending: false });

    console.log("Raw data from Supabase:", data);
    console.log("Error from Supabase:", error);

    if (error) {
      console.error("Error fetching public forms:", error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn("No published public forms found");
      return { data: [], error: null };
    }

    // Transform the data
    const forms: CustomForm[] = data.map((form: any) => ({
      id: form.id,
      name: form.name,
      type: form.type,
      category_type: form.category_type,
      status: form.status,
      visibility: form.visibility,
      description: form.description,
      administrators: [],
      created_by: "",
      created_at: form.created_at,
      updated_at: form.updated_at,
      published_at: form.published_at,
      version: 1,
      enable_steps: form.enable_steps,
      step_labels: form.step_labels,
      fields: (form.form_fields || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((field: any) => ({
          id: field.id,
          form_id: field.form_id,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          validation_rules: {},
          order_index: field.order_index,
          step_number: field.step_number,
          created_at: field.created_at || "",
          updated_at: field.updated_at || "",
        })),
    }));

    console.log("Transformed forms:", forms);
    return { data: forms, error: null };
  } catch (err) {
    console.error("Unexpected error fetching public forms:", err);
    return {
      data: null,
      error:
        err instanceof Error ? err.message : "Failed to fetch public forms",
    };
  }
}

/**
 * Get a single form by ID with all its fields
 */
export async function getFormById(
  formId: string,
): Promise<{ data: CustomForm | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("forms")
      .select("*, form_fields(*)")
      .eq("id", formId)
      .single();

    if (error) {
      console.error("Error fetching form:", error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "Form not found" };
    }

    console.log("getFormById - Raw data from database:", {
      id: data.id,
      name: data.name,
      enable_steps: data.enable_steps,
      step_labels: data.step_labels,
      fields_count: data.form_fields?.length || 0,
      first_field_step: data.form_fields?.[0]?.step_number
    });

    const form: CustomForm = {
      id: data.id,
      name: data.name,
      type: data.type,
      category_type: data.category_type,
      status: data.status,
      visibility: data.visibility,
      description: data.description,
      administrators: data.administrators,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      published_at: data.published_at,
      version: data.version,
      enable_steps: data.enable_steps,
      step_labels: data.step_labels,
      fields: (data.form_fields || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((field: any) => ({
          id: field.id,
          form_id: field.form_id,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          validation_rules: field.validation_rules,
          order_index: field.order_index,
          step_number: field.step_number,
          created_at: field.created_at,
          updated_at: field.updated_at,
        })),
    };

    return { data: form, error: null };
  } catch (err) {
    console.error("Unexpected error fetching form:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch form",
    };
  }
}

/**
 * Create a new form
 */
export async function createForm(
  formData: Partial<CustomForm>,
): Promise<{ data: CustomForm | null; error: string | null }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("forms")
      .insert({
        name: formData.name || "Untitled Form",
        type: formData.type || "Loan",
        category_type: formData.category_type,
        status: formData.status || "Draft",
        visibility: formData.visibility || "Public",
        description: formData.description,
        administrators: formData.administrators || [],
        created_by: user.user.id,
        enable_steps: formData.enable_steps || false,
        step_labels: formData.step_labels || [],
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating form:", error);
      return { data: null, error: error.message };
    }

    console.log("createForm - Created form data:", data);
    console.log("createForm - enable_steps:", data?.enable_steps);
    console.log("createForm - step_labels:", data?.step_labels);

    return {
      data: {
        ...data,
        fields: [],
      } as CustomForm,
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error creating form:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create form",
    };
  }
}

/**
 * Update an existing form
 */
export async function updateForm(
  formId: string,
  updates: Partial<CustomForm>,
): Promise<{ data: CustomForm | null; error: string | null }> {
  try {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.category_type !== undefined)
      updateData.category_type = updates.category_type;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.visibility !== undefined)
      updateData.visibility = updates.visibility;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.administrators !== undefined)
      updateData.administrators = updates.administrators;
    if (updates.enable_steps !== undefined)
      updateData.enable_steps = updates.enable_steps;
    if (updates.step_labels !== undefined)
      updateData.step_labels = updates.step_labels;

    // Set published_at when status changes to Published
    if (updates.status === "Published" && !updates.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("forms")
      .update(updateData)
      .eq("id", formId)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating form:", error);
      return { data: null, error: error.message };
    }

    return { data: data as CustomForm, error: null };
  } catch (err) {
    console.error("Unexpected error updating form:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to update form",
    };
  }
}

/**
 * Delete a form
 */
export async function deleteForm(
  formId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("forms").delete().eq("id", formId);

    if (error) {
      console.error("Error deleting form:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error deleting form:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete form",
    };
  }
}

/**
 * Create a form field
 */
export async function createFormField(
  formId: string,
  fieldData: Partial<FormField>,
): Promise<{ data: FormField | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("form_fields")
      .insert({
        form_id: formId,
        field_type: fieldData.field_type || "text",
        label: fieldData.label || "New Question",
        placeholder: fieldData.placeholder,
        required: fieldData.required || false,
        options: fieldData.options,
        validation_rules: fieldData.validation_rules,
        order_index: fieldData.order_index || 0,
        step_number: fieldData.step_number || 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating form field:", error);
      return { data: null, error: error.message };
    }

    return { data: data as FormField, error: null };
  } catch (err) {
    console.error("Unexpected error creating form field:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create field",
    };
  }
}

/**
 * Update a form field
 */
export async function updateFormField(
  fieldId: string,
  updates: Partial<FormField>,
): Promise<{ data: FormField | null; error: string | null }> {
  try {
    const updateData: any = {};

    if (updates.field_type !== undefined)
      updateData.field_type = updates.field_type;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.placeholder !== undefined)
      updateData.placeholder = updates.placeholder;
    if (updates.required !== undefined) updateData.required = updates.required;
    if (updates.options !== undefined) updateData.options = updates.options;
    if (updates.validation_rules !== undefined)
      updateData.validation_rules = updates.validation_rules;
    if (updates.order_index !== undefined)
      updateData.order_index = updates.order_index;
    if (updates.step_number !== undefined)
      updateData.step_number = updates.step_number;

    const { data, error } = await supabase
      .from("form_fields")
      .update(updateData)
      .eq("id", fieldId)
      .select()
      .single();

    if (error) {
      console.error("Error updating form field:", error);
      return { data: null, error: error.message };
    }

    return { data: data as FormField, error: null };
  } catch (err) {
    console.error("Unexpected error updating form field:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to update field",
    };
  }
}

/**
 * Delete a form field
 */
export async function deleteFormField(
  fieldId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("form_fields")
      .delete()
      .eq("id", fieldId);

    if (error) {
      console.error("Error deleting form field:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error deleting form field:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete field",
    };
  }
}

/**
 * Reorder form fields
 */
export async function reorderFormFields(
  formId: string,
  fieldOrders: { id: string; order_index: number }[],
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updates = fieldOrders.map((field) =>
      supabase
        .from("form_fields")
        .update({ order_index: field.order_index })
        .eq("id", field.id)
        .eq("form_id", formId),
    );

    const results = await Promise.all(updates);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Error reordering fields:", errors);
      return { success: false, error: "Failed to reorder some fields" };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error reordering fields:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reorder fields",
    };
  }
}

/**
 * Duplicate a form
 */
export async function duplicateForm(
  formId: string,
  newName?: string,
): Promise<{ data: CustomForm | null; error: string | null }> {
  try {
    // Get the original form with fields
    const { data: originalForm, error: fetchError } = await getFormById(formId);

    if (fetchError || !originalForm) {
      return { data: null, error: fetchError || "Form not found" };
    }

    // Create new form
    const { data: newForm, error: createError } = await createForm({
      name: newName || `${originalForm.name} (Copy)`,
      type: originalForm.type,
      category_type: originalForm.category_type,
      status: "Draft",
      visibility: originalForm.visibility,
      description: originalForm.description,
      administrators: originalForm.administrators,
    });

    if (createError || !newForm) {
      return { data: null, error: createError || "Failed to create form" };
    }

    // Create fields for the new form
    if (originalForm.fields && originalForm.fields.length > 0) {
      const fieldCreates = originalForm.fields.map((field) =>
        createFormField(newForm.id, {
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          validation_rules: field.validation_rules,
          order_index: field.order_index,
        }),
      );

      await Promise.all(fieldCreates);
    }

    // Fetch the complete new form with fields
    return await getFormById(newForm.id);
  } catch (err) {
    console.error("Unexpected error duplicating form:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to duplicate form",
    };
  }
}

/**
 * Get form submissions with optional filters
 */
export async function getFormSubmissions(filters?: {
  formId?: string;
  status?: string;
  email?: string;
}): Promise<{ data: FormSubmission[] | null; error: string | null }> {
  try {
    let query = supabase
      .from("form_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (filters?.formId) {
      query = query.eq("form_id", filters.formId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.email) {
      query = query.eq("applicant_email", filters.email);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching form submissions:", error);
      return { data: null, error: error.message };
    }

    return { data: data as FormSubmission[], error: null };
  } catch (err) {
    console.error("Unexpected error fetching form submissions:", err);
    return {
      data: null,
      error:
        err instanceof Error ? err.message : "Failed to fetch form submissions",
    };
  }
}

/**
 * Submit a form (public access - no auth required)
 * Automatically assigns to a random form administrator
 */
export async function submitForm(
  formId: string,
  applicantEmail: string,
  applicantName: string,
  fieldResponses: Record<string, any>,
  referralCode?: string,
): Promise<{ data: FormSubmission | null; error: string | null }> {
  try {
    // First, get the form to check administrators
    const { data: formData, error: formError } = await supabase
      .from("forms")
      .select("administrators")
      .eq("id", formId)
      .single();

    if (formError) {
      console.error("Error fetching form:", formError);
      return { data: null, error: formError.message };
    }

    // Randomly select an administrator if available
    let reviewedBy = null;
    if (
      formData.administrators &&
      Array.isArray(formData.administrators) &&
      formData.administrators.length > 0
    ) {
      const randomIndex = Math.floor(
        Math.random() * formData.administrators.length,
      );
      reviewedBy = formData.administrators[randomIndex];
      console.log(`[submitForm] Randomly assigned to admin: ${reviewedBy}`);
    }

    const { data, error } = await supabase
      .from("form_submissions")
      .insert({
        form_id: formId,
        applicant_email: applicantEmail,
        applicant_name: applicantName,
        field_responses: fieldResponses,
        status: "Submitted",
        reviewed_by: reviewedBy, // Auto-assign to random administrator
        referral_code: referralCode,
      })
      .select()
      .single();

    if (error) {
      console.error("Error submitting form:", error);
      return { data: null, error: error.message };
    }

    return { data: data as FormSubmission, error: null };
  } catch (err) {
    console.error("Unexpected error submitting form:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to submit form",
    };
  }
}
