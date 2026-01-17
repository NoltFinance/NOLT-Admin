
import React, { useState } from 'react';

type FieldType = 'text' | 'number' | 'select' | 'date' | 'file' | 'textarea';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

interface CustomForm {
  id: string;
  name: string;
  type: 'Loan' | 'Investment';
  fields: FormField[];
  status: 'Draft' | 'Published';
}

const INITIAL_FORMS: CustomForm[] = [
  {
    id: 'f1',
    name: 'Retail Loan Intake',
    type: 'Loan',
    status: 'Published',
    fields: [
      { id: 'fd1', type: 'text', label: 'Full Name', placeholder: 'Legal name as on ID', required: true },
      { id: 'fd2', type: 'number', label: 'Monthly Income', placeholder: 'NGN', required: true },
    ]
  }
];

const FormBuilderView: React.FC = () => {
  const [forms, setForms] = useState<CustomForm[]>(INITIAL_FORMS);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const handleCreateNew = () => {
    const newForm: CustomForm = {
      id: `f-${Math.random().toString(36).substr(2, 5)}`,
      name: 'Untitled Form',
      type: 'Loan',
      status: 'Draft',
      fields: []
    };
    setForms([...forms, newForm]);
    setSelectedForm(newForm);
  };

  const addField = () => {
    if (!selectedForm) return;
    const newField: FormField = {
      id: `fd-${Math.random().toString(36).substr(2, 5)}`,
      type: 'text',
      label: 'New Question',
      placeholder: 'Enter hint text...',
      required: false
    };
    const updatedForm = { ...selectedForm, fields: [...selectedForm.fields, newField] };
    setSelectedForm(updatedForm);
    setForms(forms.map(f => f.id === updatedForm.id ? updatedForm : f));
    setActiveField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!selectedForm) return;
    const updatedFields = selectedForm.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
    const updatedForm = { ...selectedForm, fields: updatedFields };
    setSelectedForm(updatedForm);
    setForms(forms.map(f => f.id === updatedForm.id ? updatedForm : f));
  };

  const removeField = (fieldId: string) => {
    if (!selectedForm) return;
    const updatedFields = selectedForm.fields.filter(f => f.id !== fieldId);
    const updatedForm = { ...selectedForm, fields: updatedFields };
    setSelectedForm(updatedForm);
    setForms(forms.map(f => f.id === updatedForm.id ? updatedForm : f));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!selectedForm) return;
    const newFields = [...selectedForm.fields];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFields.length) return;
    [newFields[index], newFields[targetIdx]] = [newFields[targetIdx], newFields[index]];
    const updatedForm = { ...selectedForm, fields: newFields };
    setSelectedForm(updatedForm);
  };

  const saveForm = () => {
    alert('Form configuration synced with production applicant portal.');
  };

  const currentField = selectedForm?.fields.find(f => f.id === activeField);

  if (!selectedForm) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Form Designer</h2>
            <p className="text-slate-500 font-bold">Design dynamic application intake forms for potential borrowers and investors.</p>
          </div>
          <button onClick={handleCreateNew} className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 flex items-center gap-2 uppercase text-xs tracking-widest hover:bg-blue-600 transition-all">
            <span className="material-symbols-outlined">add_circle</span>
            Design New Form
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => (
            <div key={form.id} onClick={() => setSelectedForm(form)} className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 p-6 rounded-[24px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">{form.type === 'Loan' ? 'payments' : 'trending_up'}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${form.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {form.status}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{form.name}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{form.fields.length} Dynamic Fields</p>
              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">App Type:</span>
                <span className="text-[10px] font-black text-primary uppercase">{form.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Builder Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedForm(null); setIsPreview(false); }} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input 
                value={selectedForm.name} 
                onChange={(e) => {
                  const updated = { ...selectedForm, name: e.target.value };
                  setSelectedForm(updated);
                  setForms(forms.map(f => f.id === updated.id ? updated : f));
                }}
                className="text-xl font-black text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 uppercase tracking-tight"
              />
              <span className="material-symbols-outlined text-slate-300 text-sm">edit</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Building application workflow for</span>
               <select 
                 value={selectedForm.type}
                 onChange={(e) => {
                    const updated = { ...selectedForm, type: e.target.value as any };
                    setSelectedForm(updated);
                    setForms(forms.map(f => f.id === updated.id ? updated : f));
                 }}
                 className="bg-primary/5 border-none text-[10px] font-black text-primary uppercase p-0 focus:ring-0 cursor-pointer"
               >
                 <option>Loan</option>
                 <option>Investment</option>
               </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreview(!isPreview)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isPreview ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
          >
            {isPreview ? 'Back to Editor' : 'Form Preview'}
          </button>
          <button onClick={saveForm} className="px-8 py-2.5 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 uppercase text-[10px] tracking-widest hover:bg-blue-600">Sync with Portal</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Canvas */}
        <div className={`${isPreview ? 'lg:col-span-12 max-w-2xl mx-auto' : 'lg:col-span-7'} space-y-4`}>
          <div className="bg-white dark:bg-surface-dark rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[600px]">
            <div className="mb-10 text-center">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selectedForm.name}</h4>
              <p className="text-slate-400 text-sm font-bold mt-1">Please provide the following information to proceed with your {selectedForm.type} application.</p>
            </div>

            <div className="space-y-6">
              {selectedForm.fields.length === 0 && !isPreview && (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[24px]">
                  <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">post_add</span>
                  <p className="text-slate-400 text-sm font-bold">Your form canvas is empty</p>
                  <button onClick={addField} className="mt-4 text-xs font-black text-primary uppercase tracking-widest">Add your first question</button>
                </div>
              )}

              {selectedForm.fields.map((field, idx) => (
                <div 
                  key={field.id}
                  onClick={() => !isPreview && setActiveField(field.id)}
                  className={`relative p-6 rounded-[24px] border-2 transition-all group ${
                    isPreview 
                      ? 'border-transparent bg-slate-50 dark:bg-surface-darker' 
                      : activeField === field.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-slate-50 dark:border-slate-800/50 hover:border-slate-200 cursor-pointer'
                  }`}
                >
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <div className="w-full h-24 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl" />
                    ) : field.type === 'file' ? (
                      <div className="w-full py-6 flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-slate-400">
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <span className="text-[10px] font-black uppercase">Upload Supporting Document</span>
                      </div>
                    ) : (
                      <div className="w-full h-12 bg-white dark:bg-background-dark/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 flex items-center text-slate-300 italic text-sm">
                        {field.placeholder}
                      </div>
                    )}
                  </div>

                  {!isPreview && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-surface-dark p-1 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800">
                      <button onClick={(e) => { e.stopPropagation(); moveField(idx, 'up'); }} className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">arrow_upward</span></button>
                      <button onClick={(e) => { e.stopPropagation(); moveField(idx, 'down'); }} className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">arrow_downward</span></button>
                      <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1" />
                      <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  )}
                </div>
              ))}

              {!isPreview && (
                <button onClick={addField} className="w-full py-4 border-2 border-dashed border-primary/20 rounded-[24px] text-primary font-black uppercase text-[10px] tracking-[0.2em] hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Append New Field
                </button>
              )}

              {isPreview && (
                <div className="pt-10">
                   <button className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm rounded-[24px] shadow-2xl shadow-primary/40 hover:scale-[1.02] transition-all">Submit Application</button>
                   <p className="text-center text-[10px] text-slate-500 font-bold uppercase mt-4">By submitting this form, you agree to our processing of your personal data.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Field Properties */}
        {!isPreview && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm sticky top-24">
              {currentField ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-4">
                    <span className="material-symbols-outlined text-primary">tune</span>
                    <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Field Settings</h5>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Input Label</label>
                      <input 
                        value={currentField.label}
                        onChange={(e) => updateField(currentField.id, { label: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Input Type</label>
                      <select 
                        value={currentField.type}
                        onChange={(e) => updateField(currentField.id, { type: e.target.value as FieldType })}
                        className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white uppercase tracking-wider"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Paragraph</option>
                        <option value="number">Amount / Numeric</option>
                        <option value="select">Dropdown Select</option>
                        <option value="date">Date Picker</option>
                        <option value="file">Document Upload</option>
                      </select>
                    </div>

                    {currentField.type !== 'file' && currentField.type !== 'date' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Placeholder Hint</label>
                        <input 
                          value={currentField.placeholder}
                          onChange={(e) => updateField(currentField.id, { placeholder: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-background-dark/50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-white"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="space-y-0.5">
                         <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Required Field</p>
                         <p className="text-[10px] text-slate-400 font-bold">Applicant cannot submit without this</p>
                      </div>
                      <button 
                        onClick={() => updateField(currentField.id, { required: !currentField.required })}
                        className={`w-12 h-6 rounded-full transition-all relative ${currentField.required ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentField.required ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    {currentField.type === 'select' && (
                       <div className="space-y-2 pt-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dropdown Options</label>
                         {(currentField.options || ['Option 1']).map((opt, oIdx) => (
                           <div key={oIdx} className="flex gap-2">
                              <input 
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...(currentField.options || [])];
                                  opts[oIdx] = e.target.value;
                                  updateField(currentField.id, { options: opts });
                                }}
                                className="flex-1 bg-slate-50 dark:bg-background-dark/50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-primary dark:text-white"
                              />
                           </div>
                         ))}
                         <button 
                           onClick={() => updateField(currentField.id, { options: [...(currentField.options || []), 'New Option'] })}
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
                    <span className="material-symbols-outlined text-4xl">ads_click</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Selection</p>
                    <p className="text-xs text-slate-500 font-bold px-6">Select a field on the canvas to configure its validation and UI properties.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilderView;
