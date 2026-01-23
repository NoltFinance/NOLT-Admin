import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CustomForm, FormField } from "../types";
import { getForms, submitForm } from "../services/formsService";

const PublicFormSubmissionView: React.FC = () => {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const signatureCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>(
    {},
  );
  const [drawingStates, setDrawingStates] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    setLoading(true);
    try {
      // Fetch all forms first
      const { data, error } = await getForms();

      if (error) {
        console.error("Error loading form:", error);
        return;
      }

      // Find the form and check if it's published and public
      const selectedForm = data?.find((f) => f.id === formId);
      if (
        selectedForm &&
        selectedForm.status === "Published" &&
        selectedForm.visibility === "Public"
      ) {
        setForm(selectedForm);
        // Initialize form data with default values
        const initialData: Record<string, any> = {};
        selectedForm.fields?.forEach((field) => {
          if (field.field_type === "checkbox") {
            initialData[field.id] = false;
          } else if (field.field_type === "checkbox_group") {
            initialData[field.id] = [];
          } else if (field.field_type === "rating") {
            initialData[field.id] = 0;
          } else {
            initialData[field.id] = "";
          }
        });
        setFormData(initialData);
      } else {
        console.log("Form not found or not public:", selectedForm);
        setForm(null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (field.field_type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Please enter a valid email address";
      }
    }

    if (field.field_type === "number" && value) {
      if (isNaN(Number(value))) {
        return "Please enter a valid number";
      }
    }

    if (field.field_type === "phone" && value) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(value)) {
        return "Please enter a valid phone number";
      }
    }

    return null;
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
    // Save signature as data URL
    const canvas = signatureCanvasRefs.current[fieldId];
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setFormData((prev) => ({ ...prev, [fieldId]: dataUrl }));
    }
  };

  const clearSignature = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = signatureCanvasRefs.current[fieldId];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setFormData((prev) => ({ ...prev, [fieldId]: "" }));
    }
  };

  const handleInputChange = (fieldId: string, value: any, field: FormField) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleCheckboxGroupToggle = (
    fieldId: string,
    optionValue: string,
    isChecked: boolean,
  ) => {
    setFormData((prev) => {
      const currentArray = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      const newArray = isChecked
        ? [...currentArray, optionValue]
        : currentArray.filter((item: string) => item !== optionValue);
      return { ...prev, [fieldId]: newArray };
    });

    // Clear error
    if (errors[fieldId]) {
      setErrors((prev) => {
        const { [fieldId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getCurrentStepFields = () => {
    if (!form?.fields) return [];
    if (!form.enable_steps) return form.fields;
    return form.fields.filter(
      (field) => (field.step_number || 1) === currentStep,
    );
  };

  const getTotalSteps = () => {
    if (!form?.enable_steps || !form?.fields) return 1;
    const steps = form.fields.map((f) => f.step_number || 1);
    return Math.max(...steps, 1);
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    const currentFields = getCurrentStepFields();

    currentFields.forEach((field) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, getTotalSteps()));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Scroll to first error
      const firstErrorField = document.getElementById(
        `field-${Object.keys(errors)[0]}`,
      );
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Extract email and name from form data if they exist
    let submitterEmail = "public@noltfinance.com";
    let submitterName = "Public Applicant";

    // Check if form has email or name fields and use them
    form?.fields?.forEach((field) => {
      if (field.field_type === "email" && formData[field.id]) {
        submitterEmail = formData[field.id];
      }
      if (
        field.label.toLowerCase().includes("name") &&
        field.field_type === "text" &&
        formData[field.id]
      ) {
        submitterName = formData[field.id];
      }
    });

    // Validate all form fields
    form?.fields?.forEach((field) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorField = document.getElementById(
        `field-${Object.keys(newErrors)[0]}`,
      );
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await submitForm(
        formId!,
        submitterEmail,
        submitterName,
        formData,
      );

      if (error) {
        alert(`Error submitting form: ${error}`);
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred while submitting the form");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    return (
      <div
        key={field.id}
        id={`field-${field.id}`}
        className="p-4 md:p-6 rounded-[24px] border-2 border-transparent bg-slate-50 dark:bg-surface-darker transition-all"
      >
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-rose-500">*</span>}
          </label>

          {field.field_type === "textarea" ? (
            <textarea
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              placeholder={field.placeholder || "Enter text..."}
              className="w-full h-24 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300 resize-none"
            />
          ) : field.field_type === "file" ? (
            <div className="w-full py-6 flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined">cloud_upload</span>
              <span className="text-[10px] font-black uppercase">
                {value || "Upload Supporting Document"}
              </span>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleInputChange(field.id, file.name, field);
                  }
                }}
                className="hidden"
                id={`file-${field.id}`}
              />
              <label htmlFor={`file-${field.id}`} className="cursor-pointer" />
            </div>
          ) : field.field_type === "select" ? (
            <select
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
            >
              <option value="">
                {field.placeholder || "Select an option..."}
              </option>
              {field.options?.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.field_type === "radio" ? (
            <div className="space-y-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              {field.options?.map((option, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    id={`${field.id}-${idx}`}
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) =>
                      handleInputChange(field.id, e.target.value, field)
                    }
                    className="w-5 h-5 border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
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
          ) : field.field_type === "checkbox" ? (
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) =>
                  handleInputChange(field.id, e.target.checked, field)
                }
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300 font-bold">
                {field.placeholder || "I agree to the terms"}
              </span>
            </div>
          ) : field.field_type === "checkbox_group" ? (
            <div className="space-y-3 p-4 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              {field.options?.map((option, idx) => {
                const currentValues = Array.isArray(value) ? value : [];
                const isChecked = currentValues.includes(option);

                return (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`${field.id}-${idx}`}
                      checked={isChecked}
                      onChange={(e) =>
                        handleCheckboxGroupToggle(
                          field.id,
                          option,
                          e.target.checked,
                        )
                      }
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                    <label
                      htmlFor={`${field.id}-${idx}`}
                      className="text-sm text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                    >
                      {option}
                    </label>
                  </div>
                );
              })}
            </div>
          ) : field.field_type === "date" ? (
            <input
              type="date"
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
            />
          ) : field.field_type === "rating" ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const displayRating = value || 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInputChange(field.id, star, field)}
                    className={`text-3xl transition-all ${star <= displayRating
                      ? "text-yellow-400 scale-110"
                      : "text-slate-300"
                      } cursor-pointer hover:scale-125`}
                  >
                    {star <= displayRating ? "⭐" : "☆"}
                  </button>
                );
              })}
              {value > 0 && (
                <span className="ml-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                  {value}/5
                </span>
              )}
            </div>
          ) : field.field_type === "datetime" ? (
            <input
              type="datetime-local"
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
            />
          ) : field.field_type === "time" ? (
            <input
              type="time"
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
            />
          ) : field.field_type === "url" ? (
            <input
              type="url"
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              placeholder={field.placeholder || "https://example.com"}
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
            />
          ) : field.field_type === "multiselect" ? (
            <select
              multiple
              value={value || []}
              onChange={(e) => {
                const selected = Array.from(
                  e.target.selectedOptions,
                  (option: HTMLOptionElement) => option.value,
                );
                handleInputChange(field.id, selected, field);
              }}
              className="w-full min-h-[120px] bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white cursor-pointer"
            >
              {field.options?.map((option, idx) => (
                <option key={idx} value={option} className="py-1">
                  {option}
                </option>
              ))}
            </select>
          ) : field.field_type === "toggle" ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) =>
                  handleInputChange(field.id, e.target.checked, field)
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              <span className="ms-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                {field.placeholder || "Enable option"}
              </span>
            </label>
          ) : field.field_type === "slider" ? (
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={value || 50}
                onChange={(e) =>
                  handleInputChange(field.id, e.target.value, field)
                }
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
              />
              <div className="flex justify-between text-xs text-slate-400 font-bold">
                <span>0</span>
                <span>{value || 50}</span>
                <span>100</span>
              </div>
            </div>
          ) : field.field_type === "color" ? (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) =>
                  handleInputChange(field.id, e.target.value, field)
                }
                className="w-16 h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                {value || "Pick a color"}
              </span>
            </div>
          ) : field.field_type === "signature" ? (
            <div className="space-y-3">
              <div className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 hover:border-primary transition-colors">
                <canvas
                  ref={(el) => {
                    if (el) {
                      signatureCanvasRefs.current[field.id] = el;
                      // Simple responsive fix: match parent width on mount logic would go here
                      // For now we rely on CSS scaling or standard size
                    }
                  }}
                  width={600}
                  height={200}
                  onMouseDown={(e) => startDrawing(field.id, e)}
                  onMouseMove={(e) => draw(field.id, e)}
                  onMouseUp={() => stopDrawing(field.id)}
                  onMouseOut={() => stopDrawing(field.id)}
                  onTouchStart={(e) => startDrawing(field.id, e)}
                  onTouchMove={(e) => draw(field.id, e)}
                  onTouchEnd={() => stopDrawing(field.id)}
                  className="w-full h-auto min-h-[150px] bg-white dark:bg-background-dark/50 cursor-crosshair touch-none"
                  style={{ width: '100%', height: '200px' }}
                />
                <button
                  type="button"
                  onClick={(e) => clearSignature(field.id, e)}
                  className="absolute top-3 right-3 text-[10px] font-black uppercase text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm transition-all"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-400 font-bold text-center">
                {field.placeholder || "Draw your signature above"}
              </p>
            </div>
          ) : field.field_type === "location" ? (
            <div className="space-y-2">
              <input
                type="text"
                value={value}
                onChange={(e) =>
                  handleInputChange(field.id, e.target.value, field)
                }
                placeholder={field.placeholder || "Enter location..."}
                className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
              />
              <p className="text-xs text-slate-400">
                Enter your location or address
              </p>
            </div>
          ) : (
            <input
              type={
                field.field_type === "email"
                  ? "email"
                  : field.field_type === "phone"
                    ? "tel"
                    : field.field_type === "number"
                      ? "number"
                      : "text"
              }
              value={value}
              onChange={(e) =>
                handleInputChange(field.id, e.target.value, field)
              }
              placeholder={field.placeholder || "Enter value..."}
              className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white placeholder:text-slate-300"
            />
          )}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
              <span className="material-symbols-outlined text-[14px]">
                error
              </span>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Loading form...
          </p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
            error
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Form Not Found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The form you're looking for doesn't exist or is no longer available.
          </p>
          <button
            onClick={() => navigate("/forms")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="max-w-md text-center bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">
              check_circle
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
            Submission Successful!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Thank you for your application. We've received your submission and
            will review it shortly. You'll hear from us soon.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/forms")}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              View All Forms
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/forms")}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="font-bold text-sm">Back to Forms</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px]">
                  account_balance_wallet
                </span>
              </div>
              <span className="text-lg font-black text-slate-900 dark:text-white uppercase">
                NOLT Finance
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Form Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="bg-white dark:bg-surface-dark rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-5 md:p-8 border-b border-slate-50 dark:border-slate-800">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {form.name}
            </h4>
            <p className="text-slate-400 text-sm font-bold mt-1">
              {form.description ||
                `Please provide the following information to proceed with your ${form.type} application.`}
            </p>
          </div>

          {/* Stepper - Only show if multi-step form */}
          {form.enable_steps && getTotalSteps() > 1 && (
            <div className="px-4 md:px-8 pt-6 md:pt-8 overflow-x-auto">
              <div className="relative flex items-center justify-between max-w-3xl mx-auto">
                {/* Progress Line Background */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />

                {/* Active Progress Line */}
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
                  style={{
                    width: `${((currentStep - 1) / (getTotalSteps() - 1)) * 100}%`,
                  }}
                />

                {Array.from({ length: getTotalSteps() }, (_, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = stepNum < currentStep;
                  const isActive = stepNum === currentStep;
                  const stepLabel =
                    form.step_labels?.[idx] || `Step ${stepNum}`;

                  return (
                    <div
                      key={stepNum}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${isCompleted
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                          : isActive
                            ? "bg-white dark:bg-surface-dark text-primary border-primary shadow-xl scale-110"
                            : "bg-white dark:bg-surface-dark text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800"
                          }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-[22px]">
                            check
                          </span>
                        ) : (
                          <span
                            className={`text-sm font-black ${isActive ? "animate-pulse" : ""}`}
                          >
                            {stepNum}
                          </span>
                        )}
                      </div>
                      <div className="absolute top-14 whitespace-nowrap text-center">
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest ${isCompleted || isActive
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400"
                            }`}
                        >
                          {stepLabel}
                        </p>
                        {isActive && (
                          <span className="text-[8px] font-bold text-primary uppercase tracking-tighter block mt-0.5">
                            Current Step
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 md:p-8">
            <div className="space-y-4 md:space-y-6">
              {getCurrentStepFields()
                .sort((a, b) => a.order_index - b.order_index)
                .map((field) => renderField(field))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-6 md:pt-10">
              {form.enable_steps && currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-black uppercase tracking-[0.2em] text-sm rounded-[24px] hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Previous
                </button>
              )}

              {form.enable_steps && currentStep < getTotalSteps() ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm rounded-[24px] shadow-xl shadow-primary/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm rounded-[24px] shadow-2xl shadow-primary/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              )}
            </div>

            {!form.enable_steps && (
              <p className="text-center text-[10px] text-slate-500 font-bold uppercase mt-4">
                By submitting this form, you agree to our processing of your
                personal data.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default PublicFormSubmissionView;
