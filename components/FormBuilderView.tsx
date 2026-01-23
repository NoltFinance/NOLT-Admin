import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CustomForm,
  FormField as FormFieldType,
  FormFieldType as FieldType,
} from "../types";
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  createFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields,
  duplicateForm,
} from "../services/formsService";
import supabase from "@/utils/supabase";

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order_index: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const FormBuilderView: React.FC = () => {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("");
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const usersPerPage = 10;
  const signatureCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>(
    {},
  );
  const [drawingStates, setDrawingStates] = useState<Record<string, boolean>>(
    {},
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({});
  const [ratingHoverValues, setRatingHoverValues] = useState<
    Record<string, number>
  >({});
  const [editingOptions, setEditingOptions] = useState<
    Record<string, string[]>
  >({});
  const [editingFields, setEditingFields] = useState<
    Record<string, Partial<FormField>>
  >({});
  const [editingFormMeta, setEditingFormMeta] = useState<Partial<CustomForm>>(
    {},
  );
  const [newFormData, setNewFormData] = useState({
    name: "",
    type: "Loan" as "Loan" | "Investment",
    category_type: "",
    visibility: "Public" as "Public" | "Internal" | "Private",
    description: "",
    enable_steps: false,
    step_labels: [] as string[],
  });

  useEffect(() => {
    loadForms();
    loadUsers();
  }, []);

  // Clear editing states when form changes
  useEffect(() => {
    setEditingFields({});
    setEditingOptions({});
    setEditingFormMeta({});
  }, [selectedForm?.id]);

  const loadForms = async () => {
    setLoading(true);
    const { data, error } = await getForms();
    if (error) {
      setError(error);
    } else if (data) {
      setForms(data);
    }
    setLoading(false);
  };

  const loadUsers = async (search = "", roleFilter = "", page = 0) => {
    setLoadingUsers(true);

    let query = supabase
      .from("users")
      .select("id, email, name, role", { count: "exact" })
      .eq("role", "Sales Officer"); // Only fetch Sales Officers

    // Apply search filter
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    const from = page * usersPerPage;
    const to = from + usersPerPage - 1;
    query = query.range(from, to).order("name", { ascending: true });

    const { data, error, count } = await query;

    if (!error && data) {
      setUsers(data);
      setUserTotal(count || 0);
    }
    setLoadingUsers(false);
  };

  const handlePublishForm = async () => {
    if (!selectedForm) return;

    setSaving(true);
    const { data, error } = await updateForm(selectedForm.id, {
      status: "Published",
      published_at: new Date().toISOString(),
    });

    if (error) {
      setError(error);
    } else if (data) {
      setSelectedForm(data);
      setForms(forms.map((f) => (f.id === data.id ? data : f)));
    }
    setSaving(false);
  };

  const handleOpenAdminModal = () => {
    if (selectedForm) {
      setSelectedAdmins(selectedForm.administrators || []);
      setUserSearch("");
      setUserRoleFilter("");
      setUserPage(0);
      setShowAdminModal(true);
      loadUsers("", "", 0);
    }
  };

  const handleSaveAdministrators = async () => {
    if (!selectedForm) return;

    setSaving(true);
    const { data, error } = await updateForm(selectedForm.id, {
      administrators: selectedAdmins,
    });

    if (error) {
      setError(error);
    } else if (data) {
      setSelectedForm(data);
      setForms(forms.map((f) => (f.id === data.id ? data : f)));
      setShowAdminModal(false);
    }
    setSaving(false);
  };

  const startDrawing = (
    fieldId: string,
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = signatureCanvasRefs.current[fieldId];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawingStates((prev) => ({ ...prev, [fieldId]: true }));
  };

  const draw = (
    fieldId: string,
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!drawingStates[fieldId] || !signatureCanvasRefs.current[fieldId])
      return;
    const canvas = signatureCanvasRefs.current[fieldId];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x =
      "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#028FF5";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = (fieldId: string) => {
    setDrawingStates((prev) => ({ ...prev, [fieldId]: false }));
  };

  const clearSignature = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = signatureCanvasRefs.current[fieldId];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSelectForm = async (formId: string) => {
    setLoading(true);
    const { data, error } = await getFormById(formId);
    if (!error && data) {
      setSelectedForm(data);
    }
    setLoading(false);
  };

  const handleCreateNew = async () => {
    if (!newFormData.name.trim()) {
      setError("Form name is required");
      return;
    }

    setSaving(true);
    const { data, error } = await createForm({
      name: newFormData.name,
      type: newFormData.type,
      category_type: newFormData.category_type || undefined,
      status: "Draft",
      visibility: newFormData.visibility,
      description: newFormData.description || undefined,
      enable_steps: newFormData.enable_steps,
      step_labels:
        newFormData.step_labels.length > 0
          ? newFormData.step_labels
          : undefined,
    });

    if (error) {
      setError(error);
    } else if (data) {
      setForms([data, ...forms]);
      setSelectedForm(data);
      setShowCreateModal(false);
      // Reset form data
      setNewFormData({
        name: "",
        type: "Loan",
        category_type: "",
        visibility: "Public",
        description: "",
        enable_steps: false,
        step_labels: [],
      });
    }
    setSaving(false);
  };

  const addField = async () => {
    if (!selectedForm) return;

    setSaving(true);
    const nextOrderIndex = selectedForm.fields?.length || 0;

    const { data, error } = await createFormField(selectedForm.id, {
      field_type: "text",
      label: "New Question",
      placeholder: "Enter hint text...",
      required: false,
      order_index: nextOrderIndex,
      step_number: 1,
    });

    if (error) {
      setError(error);
    } else if (data) {
      const updatedForm = {
        ...selectedForm,
        fields: [
          ...(selectedForm.fields || []),
          data as unknown as FormFieldType,
        ],
      };
      setSelectedForm(updatedForm);
      setForms(forms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
      setActiveField(data.id);
    }
    setSaving(false);
  };

  const updateField = async (fieldId: string, updates: Partial<FormField>) => {
    if (!selectedForm) return;

    setSaving(true);
    const { data, error } = await updateFormField(fieldId, updates);

    if (error) {
      setError(error);
    } else if (data) {
      const updatedFields =
        selectedForm.fields?.map((f) =>
          f.id === fieldId ? ({ ...f, ...data } as FormFieldType) : f,
        ) || [];
      const updatedForm = { ...selectedForm, fields: updatedFields };
      setSelectedForm(updatedForm);
      setForms(forms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
    }
    setSaving(false);
  };

  const removeField = async (fieldId: string) => {
    if (!selectedForm) return;

    setSaving(true);
    const { success, error } = await deleteFormField(fieldId);

    if (error) {
      setError(error);
    } else if (success) {
      const updatedFields =
        selectedForm.fields?.filter((f) => f.id !== fieldId) || [];
      const updatedForm = { ...selectedForm, fields: updatedFields };
      setSelectedForm(updatedForm);
      setForms(forms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
      if (activeField === fieldId) {
        setActiveField(null);
      }
    }
    setSaving(false);
  };

  const moveField = async (index: number, direction: "up" | "down") => {
    if (!selectedForm || !selectedForm.fields) return;

    const newFields = [...selectedForm.fields];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFields.length) return;

    [newFields[index], newFields[targetIdx]] = [
      newFields[targetIdx],
      newFields[index],
    ];

    // Update order_index for all fields
    const fieldOrders = newFields.map((f, idx) => ({
      id: f.id,
      order_index: idx,
    }));

    setSaving(true);
    const { success, error } = await reorderFormFields(
      selectedForm.id,
      fieldOrders,
    );

    if (error) {
      setError(error);
    } else if (success) {
      const updatedFields = newFields.map((f, idx) => ({
        ...f,
        order_index: idx,
      }));
      const updatedForm = { ...selectedForm, fields: updatedFields };
      setSelectedForm(updatedForm);
      setForms(forms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));
    }
    setSaving(false);
  };

  const saveForm = async () => {
    if (!selectedForm) return;

    setSaving(true);
    const { data, error } = await updateForm(selectedForm.id, {
      name: selectedForm.name,
      type: selectedForm.type,
      category_type: selectedForm.category_type,
      status: selectedForm.status,
      visibility: selectedForm.visibility,
      description: selectedForm.description,
    });

    if (error) {
      setError(error);
      toast.error("Error saving form: " + error);
    } else {
      toast.success("Form configuration synced with production applicant portal.");
    }
    setSaving(false);
  };

  const handleUpdateFormMetadata = async (updates: Partial<CustomForm>) => {
    if (!selectedForm) return;

    const updatedForm = { ...selectedForm, ...updates };
    setSelectedForm(updatedForm);
    setForms(forms.map((f) => (f.id === updatedForm.id ? updatedForm : f)));

    // Debounce the actual save
    setSaving(true);
    await updateForm(selectedForm.id, updates);
    setSaving(false);
  };

  const currentField = selectedForm?.fields?.find((f) => f.id === activeField);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Create New Form Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 md:p-8 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">
                      post_add
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Create New Form
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                      Configure your application intake workflow
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 md:p-8 space-y-6 overflow-y-auto">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Form Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Form Name *
                    </label>
                    <input
                      type="text"
                      value={newFormData.name}
                      onChange={(e) =>
                        setNewFormData({ ...newFormData, name: e.target.value })
                      }
                      placeholder="e.g., Retail Loan Application, Investment Onboarding"
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Form Type & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Application Type *
                      </label>
                      <select
                        value={newFormData.type}
                        onChange={(e) =>
                          setNewFormData({
                            ...newFormData,
                            type: e.target.value as "Loan" | "Investment",
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                      >
                        <option value="Loan">Loan Application</option>
                        <option value="Investment">
                          Investment Application
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Category (Optional)
                      </label>
                      <select
                        value={newFormData.category_type}
                        onChange={(e) =>
                          setNewFormData({
                            ...newFormData,
                            category_type: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                      >
                        <option value="">No Category</option>
                        {newFormData.type === "Loan" ? (
                          <>
                            <option value="Business">Business</option>
                            <option value="Employees">Employees</option>
                            <option value="Niche">Niche</option>
                          </>
                        ) : (
                          <>
                            <option value="NOLT Rise">NOLT Rise</option>
                            <option value="NOLT Vault">NOLT Vault</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Form Visibility *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["Public", "Internal", "Private"] as const).map(
                        (visibility) => (
                          <button
                            key={visibility}
                            onClick={() =>
                              setNewFormData({ ...newFormData, visibility })
                            }
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${newFormData.visibility === visibility
                              ? "border-primary bg-primary/5"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                              }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`material-symbols-outlined text-xl ${newFormData.visibility === visibility
                                  ? "text-primary"
                                  : "text-slate-400"
                                  }`}
                              >
                                {visibility === "Public"
                                  ? "public"
                                  : visibility === "Internal"
                                    ? "business"
                                    : "lock"}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                {visibility}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                              {visibility === "Public"
                                ? "Anyone can access"
                                : visibility === "Internal"
                                  ? "Staff members only"
                                  : "Restricted access"}
                            </p>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newFormData.description}
                      onChange={(e) =>
                        setNewFormData({
                          ...newFormData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Brief description of what this form is used for..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 md:p-8 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-surface-dark rounded-b-[32px]">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={saving || !newFormData.name.trim()}
                  className="px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? "Creating..." : "Create Form"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!selectedForm) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Form Designer
            </h2>
            <p className="text-slate-500 font-bold">
              Design dynamic application intake forms for potential borrowers
              and investors.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={saving}
            className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-2 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Design New Form
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 p-6 rounded-[24px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">
                    {form.type === "Loan" ? "payments" : "trending_up"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${form.status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {form.status}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${form.visibility === "Public"
                      ? "bg-blue-100 text-blue-700"
                      : form.visibility === "Internal"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    {form.visibility}
                  </span>
                </div>
              </div>
              <h3
                onClick={() => handleSelectForm(form.id)}
                className="text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer"
              >
                {form.name}
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                {form.fields?.length || 0} Dynamic Fields
              </p>
              {form.category_type && (
                <div className="mt-2">
                  <span className="text-[10px] px-2 py-1 rounded-md bg-purple-100 text-purple-700 font-black uppercase">
                    {form.category_type}
                  </span>
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">
                    App Type:
                  </span>
                  <span className="text-[10px] font-black text-primary uppercase">
                    {form.type}
                  </span>
                </div>
                {form.administrators && form.administrators.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <span className="material-symbols-outlined text-sm">
                      admin_panel_settings
                    </span>
                    {form.administrators.length}
                  </div>
                )}
              </div>

              {/* Action Menu */}
              <div className="mt-4 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === form.id ? null : form.id);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                >
                  <span className="text-slate-600 dark:text-slate-300">
                    Actions
                  </span>
                  <span className="material-symbols-outlined text-slate-400">
                    {openMenuId === form.id ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {openMenuId === form.id && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectForm(form.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-primary text-lg">
                        edit
                      </span>
                      Edit Form
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedForm(form);
                        setSelectedAdmins(form.administrators || []);
                        setShowAdminModal(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-indigo-600 text-lg">
                        admin_panel_settings
                      </span>
                      Manage Administrators
                    </button>
                    {form.status === "Draft" && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setSaving(true);
                          const { data, error } = await updateForm(form.id, {
                            status: "Published",
                            published_at: new Date().toISOString(),
                          });
                          if (error) {
                            setError(error);
                          } else if (data) {
                            setForms(
                              forms.map((f) => (f.id === data.id ? data : f)),
                            );
                          }
                          setSaving(false);
                        }}
                        disabled={saving}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-green-600 text-lg">
                          publish
                        </span>
                        Publish Form
                      </button>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Are you sure you want to duplicate "${form.name}"?`,
                          )
                        ) {
                          setOpenMenuId(null);
                          setSaving(true);
                          const { data, error } = await duplicateForm(form.id);
                          if (error) {
                            setError(error);
                          } else if (data) {
                            await loadForms();
                          }
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-blue-600 text-lg">
                        content_copy
                      </span>
                      Duplicate Form
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Are you sure you want to delete "${form.name}"? This action cannot be undone.`,
                          )
                        ) {
                          setOpenMenuId(null);
                          setSaving(true);
                          const { error } = await deleteForm(form.id);
                          if (error) {
                            setError(error);
                          } else {
                            setForms(forms.filter((f) => f.id !== form.id));
                          }
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-3 text-sm font-bold text-red-600 dark:text-red-400 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg">
                        delete
                      </span>
                      Delete Form
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create New Form Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">
                      post_add
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Create New Form
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                      Configure your application intake workflow
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Form Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Form Name *
                    </label>
                    <input
                      type="text"
                      value={newFormData.name}
                      onChange={(e) =>
                        setNewFormData({ ...newFormData, name: e.target.value })
                      }
                      placeholder="e.g., Retail Loan Application, Investment Onboarding"
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Form Type & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Application Type *
                      </label>
                      <select
                        value={newFormData.type}
                        onChange={(e) =>
                          setNewFormData({
                            ...newFormData,
                            type: e.target.value as "Loan" | "Investment",
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                      >
                        <option value="Loan">Loan Application</option>
                        <option value="Investment">
                          Investment Application
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Category (Optional)
                      </label>
                      <select
                        value={newFormData.category_type}
                        onChange={(e) =>
                          setNewFormData({
                            ...newFormData,
                            category_type: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                      >
                        <option value="">No Category</option>
                        {newFormData.type === "Loan" ? (
                          <>
                            <option value="Business">Business</option>
                            <option value="Employees">Employees</option>
                            <option value="Niche">Niche</option>
                          </>
                        ) : (
                          <>
                            <option value="NOLT Rise">NOLT Rise</option>
                            <option value="NOLT Vault">NOLT Vault</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Form Visibility *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["Public", "Internal", "Private"] as const).map(
                        (visibility) => (
                          <button
                            key={visibility}
                            onClick={() =>
                              setNewFormData({ ...newFormData, visibility })
                            }
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${newFormData.visibility === visibility
                              ? "border-primary bg-primary/5"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
                              }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`material-symbols-outlined text-xl ${newFormData.visibility === visibility
                                  ? "text-primary"
                                  : "text-slate-400"
                                  }`}
                              >
                                {visibility === "Public"
                                  ? "public"
                                  : visibility === "Internal"
                                    ? "business"
                                    : "lock"}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                {visibility}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                              {visibility === "Public"
                                ? "Anyone can access"
                                : visibility === "Internal"
                                  ? "Staff members only"
                                  : "Restricted access"}
                            </p>
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newFormData.description}
                      onChange={(e) =>
                        setNewFormData({
                          ...newFormData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Brief description of what this form is used for..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-8 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={saving || !newFormData.name.trim()}
                  className="px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? "Creating..." : "Create Form"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto text-amber-500">
          <span className="material-symbols-outlined text-4xl">
            desktop_windows
          </span>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Desktop View Required
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-2 leading-relaxed">
            The advanced Form Builder is optimized for larger screens. Please
            access this tool on a desktop or tablet for the best experience.
          </p>
        </div>
        <button
          onClick={() => setSelectedForm(null)}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="hidden md:block space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Builder Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedForm(null);
                setIsPreview(false);
              }}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={editingFormMeta.name ?? selectedForm.name}
                  onChange={(e) =>
                    setEditingFormMeta((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    const value = editingFormMeta.name;
                    if (value !== undefined && value !== selectedForm.name) {
                      handleUpdateFormMetadata({ name: value });
                    }
                    setEditingFormMeta((prev) => {
                      const { name, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className="text-xl font-black text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 uppercase tracking-tight"
                />
                <span className="material-symbols-outlined text-slate-300 text-sm">
                  edit
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Building application workflow for
                </span>
                <select
                  value={selectedForm.type}
                  onChange={(e) =>
                    handleUpdateFormMetadata({ type: e.target.value as any })
                  }
                  className="bg-primary/5 border-none text-[10px] font-black text-primary uppercase p-0 focus:ring-0 cursor-pointer"
                >
                  <option>Loan</option>
                  <option>Investment</option>
                </select>
                <span className="text-slate-300">•</span>
                <select
                  value={selectedForm.category_type || ""}
                  onChange={(e) =>
                    handleUpdateFormMetadata({ category_type: e.target.value })
                  }
                  className="bg-purple-50 border-none text-[10px] font-black text-purple-700 uppercase p-0 focus:ring-0 cursor-pointer"
                >
                  <option value="">No Category</option>
                  <option>Business</option>
                  <option>Employees</option>
                  <option>Niche</option>
                  <option>NOLT Rise</option>
                  <option>NOLT Vault</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedForm.status === "Draft" && (
              <button
                onClick={handlePublishForm}
                disabled={saving}
                className="px-6 py-2.5 bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-500/20 uppercase text-[10px] tracking-widest hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">publish</span>
                Publish Form
              </button>
            )}
            {selectedForm.status === "Published" && (
              <div className="px-4 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-sm">
                  check_circle
                </span>
                <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">
                  Published
                </span>
              </div>
            )}

            {/* Settings Menu */}
            <div className="relative">
              <button
                onClick={() =>
                  setOpenMenuId(openMenuId === "settings" ? null : "settings")
                }
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  settings
                </span>
                Settings
                <span className="material-symbols-outlined text-sm">
                  {openMenuId === "settings" ? "expand_less" : "expand_more"}
                </span>
              </button>

              {openMenuId === "settings" && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      handleOpenAdminModal();
                      setOpenMenuId(null);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-indigo-600 text-lg">
                      admin_panel_settings
                    </span>
                    <div className="flex-1">
                      <div>Administrators</div>
                      {selectedForm.administrators &&
                        selectedForm.administrators.length > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {selectedForm.administrators.length} assigned
                          </div>
                        )}
                    </div>
                  </button>

                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Application Type
                      </label>
                      <select
                        value={selectedForm.type}
                        onChange={(e) => {
                          handleUpdateFormMetadata({
                            type: e.target.value as any,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="Loan">Loan</option>
                        <option value="Investment">Investment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Category Type
                      </label>
                      <select
                        value={selectedForm.category_type || ""}
                        onChange={(e) => {
                          handleUpdateFormMetadata({
                            category_type: e.target.value,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="">No Category</option>
                        <option value="Business">Business</option>
                        <option value="Employees">Employees</option>
                        <option value="Niche">Niche</option>
                        <option value="NOLT Rise">NOLT Rise</option>
                        <option value="NOLT Vault">NOLT Vault</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Status
                      </label>
                      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {["Draft", "Published", "Archived"].map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              handleUpdateFormMetadata({ status: status as any })
                            }
                            className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all ${selectedForm.status === status
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Visibility
                    </label>
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {["Public", "Internal", "Private"].map((visibility) => (
                        <button
                          key={visibility}
                          onClick={() =>
                            handleUpdateFormMetadata({
                              visibility: visibility as any,
                            })
                          }
                          className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all ${selectedForm.visibility === visibility
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                          {visibility}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isPreview ? "bg-indigo-500 text-white border-indigo-500" : "bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"}`}
            >
              {isPreview ? "Back to Editor" : "Form Preview"}
            </button>
            <button
              onClick={saveForm}
              disabled={saving}
              className="px-8 py-2.5 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 uppercase text-[10px] tracking-widest hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Sync with Portal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Canvas */}
          <div
            className={`${isPreview ? "lg:col-span-12 max-w-2xl mx-auto" : "lg:col-span-7"} space-y-4`}
          >
            <div className="bg-white dark:bg-surface-dark rounded-[32px] p-5 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[600px]">
              <div className="mb-10 text-center">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  {selectedForm.name}
                </h4>
                <p className="text-slate-400 text-sm font-bold mt-1">
                  Please provide the following information to proceed with your{" "}
                  {selectedForm.type} application.
                </p>
              </div>

              <div className="space-y-6">
                {(!selectedForm.fields || selectedForm.fields.length === 0) &&
                  !isPreview && (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[24px]">
                      <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">
                        post_add
                      </span>
                      <p className="text-slate-400 text-sm font-bold">
                        Your form canvas is empty
                      </p>
                      <button
                        onClick={addField}
                        disabled={saving}
                        className="mt-4 text-xs font-black text-primary uppercase tracking-widest"
                      >
                        Add your first question
                      </button>
                    </div>
                  )}

                {selectedForm.fields &&
                  selectedForm.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      onClick={() => !isPreview && setActiveField(field.id)}
                      className={`relative p-4 md:p-6 rounded-[24px] border-2 transition-all group ${isPreview
                        ? "border-transparent bg-slate-50 dark:bg-surface-darker"
                        : activeField === field.id
                          ? "border-primary bg-primary/5"
                          : "border-slate-50 dark:border-slate-800/50 hover:border-slate-200 cursor-pointer"
                        }`}
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                          {field.label}
                          {field.required && (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        {field.field_type === "textarea" ? (
                          <textarea
                            placeholder={field.placeholder || "Enter text..."}
                            className="w-full h-24 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300 resize-none"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "file" ? (
                          <div className="w-full py-6 flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                            <span className="material-symbols-outlined">
                              cloud_upload
                            </span>
                            <span className="text-[10px] font-black uppercase">
                              Upload Supporting Document
                            </span>
                            {isPreview && (
                              <input type="file" className="hidden" />
                            )}
                          </div>
                        ) : field.field_type === "select" ? (
                          <select
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                            disabled={!isPreview}
                          >
                            <option value="">
                              {field.placeholder || "Select an option..."}
                            </option>
                            {Array.isArray(field.options) &&
                              field.options.map((option, idx) => (
                                <option key={idx} value={option}>
                                  {option}
                                </option>
                              ))}
                          </select>
                        ) : field.field_type === "multiselect" ? (
                          <select
                            multiple
                            className="w-full min-h-[120px] bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                            disabled={!isPreview}
                          >
                            {Array.isArray(field.options) &&
                              field.options.map((option, idx) => (
                                <option key={idx} value={option} className="py-1">
                                  {option}
                                </option>
                              ))}
                          </select>
                        ) : field.field_type === "checkbox" ? (
                          <div className="flex items-center gap-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                              disabled={!isPreview}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-bold">
                              {field.placeholder || "I agree to the terms"}
                            </span>
                          </div>
                        ) : field.field_type === "checkbox_group" ? (
                          <div className="space-y-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                            {Array.isArray(field.options) &&
                              field.options.map((option, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <input
                                    type="checkbox"
                                    id={`${field.id}-${idx}`}
                                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                    disabled={!isPreview}
                                  />
                                  <label
                                    htmlFor={`${field.id}-${idx}`}
                                    className="text-sm text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                          </div>
                        ) : field.field_type === "radio" ? (
                          <div className="space-y-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                            {Array.isArray(field.options) &&
                              field.options.map((option, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <input
                                    type="radio"
                                    id={`${field.id}-${idx}`}
                                    name={field.id}
                                    className="w-5 h-5 border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                                    disabled={!isPreview}
                                  />
                                  <label
                                    htmlFor={`${field.id}-${idx}`}
                                    className="text-sm text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                          </div>
                        ) : field.field_type === "date" ? (
                          <input
                            type="date"
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "datetime" ? (
                          <input
                            type="datetime-local"
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "time" ? (
                          <input
                            type="time"
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "email" ? (
                          <input
                            type="email"
                            placeholder={field.placeholder || "email@example.com"}
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "phone" ? (
                          <input
                            type="tel"
                            placeholder={field.placeholder || "+234 800 000 0000"}
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "url" ? (
                          <input
                            type="url"
                            placeholder={
                              field.placeholder || "https://example.com"
                            }
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "number" ? (
                          <input
                            type="number"
                            placeholder={field.placeholder || "0"}
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
                            disabled={!isPreview}
                          />
                        ) : field.field_type === "color" ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              className="w-16 h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer"
                              disabled={!isPreview}
                            />
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                              Pick a color
                            </span>
                          </div>
                        ) : field.field_type === "toggle" ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              disabled={!isPreview}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                            <span className="ms-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                              {field.placeholder || "Enable option"}
                            </span>
                          </label>
                        ) : field.field_type === "rating" ? (
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const currentRating = ratingValues[field.id] || 0;
                              const hoverRating =
                                ratingHoverValues[field.id] || 0;
                              const displayRating = hoverRating || currentRating;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    isPreview &&
                                    setRatingValues((prev) => ({
                                      ...prev,
                                      [field.id]: star,
                                    }))
                                  }
                                  onMouseEnter={() =>
                                    isPreview &&
                                    setRatingHoverValues((prev) => ({
                                      ...prev,
                                      [field.id]: star,
                                    }))
                                  }
                                  onMouseLeave={() =>
                                    isPreview &&
                                    setRatingHoverValues((prev) => ({
                                      ...prev,
                                      [field.id]: 0,
                                    }))
                                  }
                                  className={`text-3xl transition-all ${star <= displayRating
                                    ? "text-yellow-400 scale-110"
                                    : "text-slate-300"
                                    } ${isPreview
                                      ? "cursor-pointer hover:scale-125"
                                      : "cursor-not-allowed"
                                    }`}
                                  disabled={!isPreview}
                                >
                                  {star <= displayRating ? "⭐" : "☆"}
                                </button>
                              );
                            })}
                            {isPreview && ratingValues[field.id] > 0 && (
                              <span className="ml-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                                {ratingValues[field.id]}/5
                              </span>
                            )}
                          </div>
                        ) : field.field_type === "slider" ? (
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              defaultValue="50"
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
                              disabled={!isPreview}
                            />
                            <div className="flex justify-between text-xs text-slate-400 font-bold">
                              <span>0</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>
                        ) : field.field_type === "signature" ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <canvas
                                ref={(el) => {
                                  if (el)
                                    signatureCanvasRefs.current[field.id] = el;
                                }}
                                width={600}
                                height={200}
                                onMouseDown={(e) =>
                                  isPreview && startDrawing(field.id, e)
                                }
                                onMouseMove={(e) =>
                                  isPreview && draw(field.id, e)
                                }
                                onMouseUp={() =>
                                  isPreview && stopDrawing(field.id)
                                }
                                onMouseOut={() =>
                                  isPreview && stopDrawing(field.id)
                                }
                                onTouchStart={(e) =>
                                  isPreview && startDrawing(field.id, e)
                                }
                                onTouchMove={(e) =>
                                  isPreview && draw(field.id, e)
                                }
                                onTouchEnd={() =>
                                  isPreview && stopDrawing(field.id)
                                }
                                className={`w-full h-48 bg-white dark:bg-background-dark/50 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl transition-colors ${isPreview
                                  ? "cursor-crosshair hover:border-primary"
                                  : "cursor-not-allowed"
                                  }`}
                              />
                              {isPreview && (
                                <button
                                  type="button"
                                  onClick={(e) => clearSignature(field.id, e)}
                                  className="absolute top-3 right-3 text-[10px] font-black uppercase text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm transition-all"
                                >
                                  Clear
                                </button>
                              )}
                              {!isPreview && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-center opacity-30">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">
                                      edit
                                    </span>
                                    <p className="text-xs text-slate-400 font-bold mt-2">
                                      Signature canvas
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {isPreview && (
                              <p className="text-xs text-slate-400 font-bold text-center">
                                {field.placeholder || "Draw your signature above"}
                              </p>
                            )}
                          </div>
                        ) : field.field_type === "location" ? (
                          <div className="space-y-3">
                            <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                              <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-400">
                                  location_on
                                </span>
                                <p className="text-xs text-slate-400 font-bold mt-2">
                                  {isPreview
                                    ? "Click to select location"
                                    : "Map view"}
                                </p>
                              </div>
                            </div>
                            {isPreview && (
                              <button
                                type="button"
                                className="w-full px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-colors"
                              >
                                Use Current Location
                              </button>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder || "Enter value..."}
                            className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
                            disabled={!isPreview}
                          />
                        )}
                      </div>

                      {!isPreview && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-surface-dark p-1 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(idx, "up");
                            }}
                            disabled={saving}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              arrow_upward
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(idx, "down");
                            }}
                            disabled={saving}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              arrow_downward
                            </span>
                          </button>
                          <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                            disabled={saving}
                            className="p-1 hover:text-rose-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                {!isPreview && (
                  <button
                    onClick={addField}
                    disabled={saving}
                    className="w-full py-4 border-2 border-dashed border-primary/20 rounded-[24px] text-primary font-black uppercase text-[10px] tracking-[0.2em] hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      add_circle
                    </span>
                    Append New Field
                  </button>
                )}

                {isPreview && (
                  <div className="pt-10">
                    <button className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm rounded-[24px] shadow-2xl shadow-primary/40 hover:scale-[1.02] transition-all">
                      Submit Application
                    </button>
                    <p className="text-center text-[10px] text-slate-500 font-bold uppercase mt-4">
                      By submitting this form, you agree to our processing of your
                      personal data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Field Properties */}
          {!isPreview && (
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-surface-dark rounded-[32px] p-4 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm sticky top-24">
                {currentField ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-4">
                      <span className="material-symbols-outlined text-primary">
                        tune
                      </span>
                      <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">
                        Field Settings
                      </h5>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Input Label
                        </label>
                        <input
                          value={
                            editingFields[currentField.id]?.label ??
                            currentField.label
                          }
                          onChange={(e) =>
                            setEditingFields((prev) => ({
                              ...prev,
                              [currentField.id]: {
                                ...prev[currentField.id],
                                label: e.target.value,
                              },
                            }))
                          }
                          onBlur={() => {
                            const value = editingFields[currentField.id]?.label;
                            if (
                              value !== undefined &&
                              value !== currentField.label
                            ) {
                              updateField(currentField.id, { label: value });
                            }
                            setEditingFields((prev) => {
                              const newState = { ...prev };
                              if (newState[currentField.id]) {
                                delete newState[currentField.id].label;
                                if (
                                  Object.keys(newState[currentField.id])
                                    .length === 0
                                ) {
                                  delete newState[currentField.id];
                                }
                              }
                              return newState;
                            });
                          }}
                          className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Input Type
                        </label>
                        <select
                          value={currentField.field_type}
                          onChange={(e) =>
                            updateField(currentField.id, {
                              field_type: e.target.value as FieldType,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white uppercase tracking-wider"
                        >
                          <optgroup label="Text Inputs">
                            <option value="text">Short Text</option>
                            <option value="textarea">Paragraph</option>
                            <option value="email">Email Address</option>
                            <option value="phone">Phone Number</option>
                            <option value="url">Website URL</option>
                            <option value="number">Amount / Numeric</option>
                          </optgroup>
                          <optgroup label="Selection">
                            <option value="select">Dropdown Select</option>
                            <option value="multiselect">
                              Multi-Select Dropdown
                            </option>
                            <option value="radio">Radio Buttons</option>
                            <option value="checkbox">Single Checkbox</option>
                            <option value="checkbox_group">Checkbox Group</option>
                          </optgroup>
                          <optgroup label="Date & Time">
                            <option value="date">Date Picker</option>
                            <option value="datetime">Date & Time Picker</option>
                            <option value="time">Time Picker</option>
                          </optgroup>
                          <optgroup label="Interactive">
                            <option value="toggle">Toggle Switch</option>
                            <option value="slider">Range Slider</option>
                            <option value="rating">Star Rating</option>
                            <option value="color">Color Picker</option>
                          </optgroup>
                          <optgroup label="Advanced">
                            <option value="file">Document Upload</option>
                            <option value="signature">Signature Canvas</option>
                            <option value="location">Location Picker</option>
                          </optgroup>
                        </select>
                      </div>

                      {currentField.field_type !== "file" &&
                        currentField.field_type !== "date" &&
                        currentField.field_type !== "checkbox" && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Placeholder Hint
                            </label>
                            <input
                              value={
                                editingFields[currentField.id]?.placeholder ??
                                currentField.placeholder ??
                                ""
                              }
                              onChange={(e) =>
                                setEditingFields((prev) => ({
                                  ...prev,
                                  [currentField.id]: {
                                    ...prev[currentField.id],
                                    placeholder: e.target.value,
                                  },
                                }))
                              }
                              onBlur={() => {
                                const value =
                                  editingFields[currentField.id]?.placeholder;
                                if (
                                  value !== undefined &&
                                  value !== currentField.placeholder
                                ) {
                                  updateField(currentField.id, {
                                    placeholder: value,
                                  });
                                }
                                setEditingFields((prev) => {
                                  const newState = { ...prev };
                                  if (newState[currentField.id]) {
                                    delete newState[currentField.id].placeholder;
                                    if (
                                      Object.keys(newState[currentField.id])
                                        .length === 0
                                    ) {
                                      delete newState[currentField.id];
                                    }
                                  }
                                  return newState;
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white"
                            />
                          </div>
                        )}

                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                            Required Field
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Applicant cannot submit without this
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateField(currentField.id, {
                              required: !currentField.required,
                            })
                          }
                          className={`w-12 h-6 rounded-full transition-all relative ${currentField.required ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentField.required ? "right-1" : "left-1"}`}
                          />
                        </button>
                      </div>

                      {(currentField.field_type === "select" ||
                        currentField.field_type === "multiselect" ||
                        currentField.field_type === "radio" ||
                        currentField.field_type === "checkbox_group") && (
                          <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              {currentField.field_type === "select" ||
                                currentField.field_type === "multiselect"
                                ? "Dropdown Options"
                                : currentField.field_type === "radio"
                                  ? "Radio Button Options"
                                  : "Checkbox Options"}
                            </label>
                            {(
                              editingOptions[currentField.id] ||
                              currentField.options || ["Option 1"]
                            ).map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-2">
                                <input
                                  value={opt}
                                  onChange={(e) => {
                                    const currentOpts =
                                      editingOptions[currentField.id] ||
                                      currentField.options ||
                                      [];
                                    const opts = [...currentOpts];
                                    opts[oIdx] = e.target.value;
                                    setEditingOptions((prev) => ({
                                      ...prev,
                                      [currentField.id]: opts,
                                    }));
                                  }}
                                  onBlur={() => {
                                    const opts = editingOptions[currentField.id];
                                    if (opts) {
                                      updateField(currentField.id, {
                                        options: opts,
                                      });
                                      setEditingOptions((prev) => {
                                        const newState = { ...prev };
                                        delete newState[currentField.id];
                                        return newState;
                                      });
                                    }
                                  }}
                                  className="flex-1 bg-slate-50 dark:bg-background-dark/50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary dark:text-white"
                                />
                                {(
                                  editingOptions[currentField.id] ||
                                  currentField.options ||
                                  []
                                ).length > 1 && (
                                    <button
                                      onClick={() => {
                                        const currentOpts =
                                          editingOptions[currentField.id] ||
                                          currentField.options ||
                                          [];
                                        const opts = [...currentOpts];
                                        opts.splice(oIdx, 1);
                                        setEditingOptions((prev) => ({
                                          ...prev,
                                          [currentField.id]: opts,
                                        }));
                                        updateField(currentField.id, {
                                          options: opts,
                                        });
                                      }}
                                      className="px-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        close
                                      </span>
                                    </button>
                                  )}
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const currentOpts =
                                  editingOptions[currentField.id] ||
                                  currentField.options ||
                                  [];
                                const opts = [...currentOpts, "New Option"];
                                setEditingOptions((prev) => ({
                                  ...prev,
                                  [currentField.id]: opts,
                                }));
                                updateField(currentField.id, { options: opts });
                              }}
                              className="text-[10px] font-black text-primary uppercase tracking-widest ml-1"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-background-dark/50 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto">
                      <span className="material-symbols-outlined text-4xl">
                        ads_click
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        No Selection
                      </p>
                      <p className="text-xs text-slate-500 font-bold px-6">
                        Select a field on the canvas to configure its validation
                        and UI properties.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Administrators Modal */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header - Fixed */}
              <div className="flex-none flex items-center justify-between p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">
                      admin_panel_settings
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Assign Administrators
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      Select users who can manage this form
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 min-h-0">
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                      {error}
                    </p>
                  </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                      search
                    </span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(0);
                        loadUsers(e.target.value, "", 0);
                      }}
                      placeholder="Search Sales Officers..."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-background-dark/50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  {selectedAdmins.length > 0 && (
                    <button
                      onClick={() => setSelectedAdmins([])}
                      className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        clear_all
                      </span>
                      Clear All
                    </button>
                  )}
                </div>

                {/* Users List - Auto height */}
                <div className="space-y-2">
                  {loadingUsers ? (
                    <div className="text-center py-10">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-400 font-bold">
                        Loading users...
                      </p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-slate-400 font-bold">
                        {userSearch
                          ? "No Sales Officers found"
                          : "No Sales Officers available"}
                      </p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          if (selectedAdmins.includes(user.id)) {
                            setSelectedAdmins(
                              selectedAdmins.filter((id) => id !== user.id),
                            );
                          } else {
                            setSelectedAdmins([...selectedAdmins, user.id]);
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedAdmins.includes(user.id)
                          ? "border-primary bg-primary/5"
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-xl">
                                person
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white">
                                {user.name || user.email}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-500 font-bold truncate max-w-[150px] md:max-w-none">
                                  {user.email}
                                </p>
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase whitespace-nowrap">
                                  {user.role}
                                </span>
                              </div>
                            </div>
                          </div>
                          {selectedAdmins.includes(user.id) && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-white text-sm">
                                check
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {userTotal > usersPerPage && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 font-bold order-2 md:order-1">
                      Showing {userPage * usersPerPage + 1}-
                      {Math.min((userPage + 1) * usersPerPage, userTotal)} of{" "}
                      {userTotal} users
                    </p>
                    <div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto justify-between md:justify-end">
                      <button
                        onClick={() => {
                          const newPage = userPage - 1;
                          setUserPage(newPage);
                          loadUsers(userSearch, "", newPage);
                        }}
                        disabled={userPage === 0 || loadingUsers}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                        Page {userPage + 1} of{" "}
                        {Math.ceil(userTotal / usersPerPage)}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = userPage + 1;
                          setUserPage(newPage);
                          loadUsers(userSearch, "", newPage);
                        }}
                        disabled={
                          (userPage + 1) * usersPerPage >= userTotal ||
                          loadingUsers
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer - Fixed */}
              <div className="flex-none flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-xs text-slate-500 font-bold order-2 md:order-1">
                  {selectedAdmins.length} administrator
                  {selectedAdmins.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto order-1 md:order-2">
                  <button
                    onClick={() => {
                      setShowAdminModal(false);
                      setError(null);
                    }}
                    disabled={saving}
                    className="w-full md:w-auto px-6 py-3 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAdministrators}
                    disabled={saving}
                    className="w-full md:w-auto px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {saving ? "Saving..." : "Save Administrators"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FormBuilderView;
