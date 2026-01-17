
import React, { useState } from 'react';

interface ExportFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedFields: string[]) => void;
  categories: {
    title: string;
    fields: { id: string; label: string }[];
  }[];
}

const ExportFieldsModal: React.FC<ExportFieldsModalProps> = ({ isOpen, onClose, onConfirm, categories }) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(categories.flatMap(c => c.fields.map(f => f.id)))
  );

  if (!isOpen) return null;

  const toggleField = (id: string) => {
    const next = new Set(selectedFields);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFields(next);
  };

  const toggleCategory = (fields: { id: string }[]) => {
    const next = new Set(selectedFields);
    const allSelected = fields.every(f => next.has(f.id));
    if (allSelected) {
      fields.forEach(f => next.delete(f.id));
    } else {
      fields.forEach(f => next.add(f.id));
    }
    setSelectedFields(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Customize Export Fields</h3>
            <p className="text-xs text-slate-500 mt-1">Select the specific data points you want to include in your CSV report.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest">{cat.title}</h4>
                  <button 
                    onClick={() => toggleCategory(cat.fields)}
                    className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                  >
                    {cat.fields.every(f => selectedFields.has(f.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2">
                  {cat.fields.map(field => (
                    <label key={field.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedFields.has(field.id)}
                          onChange={() => toggleField(field.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:bg-slate-700 text-primary focus:ring-primary transition-all"
                        />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-background-dark flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 font-medium">
            {selectedFields.size} fields selected for export
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
            <button 
              onClick={() => onConfirm(Array.from(selectedFields))}
              className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              Generate CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportFieldsModal;
