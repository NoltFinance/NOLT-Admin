import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CustomForm } from "../types";
import { getPublicForms } from "../services/formsService";

const PublicFormsView: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      console.log("Loading public forms...");
      const { data, error } = await getPublicForms();

      console.log("Response data:", data);
      console.log("Response error:", error);

      if (error) {
        console.error("Error loading forms:", error);
        setForms([]);
      } else {
        setForms(data || []);
      }
    } catch (error) {
      console.error("Exception while loading forms:", error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      filterType === "all" || form.application_type === filterType;

    return matchesSearch && matchesType;
  });

  const handleFormClick = (formId: string) => {
    navigate(`/apply/${formId}`);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Investment:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      Loan: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      General:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
    return colors[type] || colors.General;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-[24px]">
                  account_balance_wallet
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  NOLT Finance
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Application Portal
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                login
              </span>
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Apply for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              Financial Services
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose from our range of investment and loan products. Fill out the
            application form and we'll get back to you shortly.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="Investment">Investment</option>
            <option value="Loan">Loan</option>
            <option value="General">General</option>
          </select>
        </div>

        {/* Forms Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Loading forms...
              </p>
            </div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">
              description
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              No Forms Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery
                ? "No forms match your search criteria"
                : "Check back later for new application forms"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                onClick={() => handleFormClick(form.id)}
                className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-6 hover:border-primary hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                      {form.name}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {form.application_type && (
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${getTypeColor(form.application_type)}`}
                    >
                      {form.application_type}
                    </span>
                  )}
                  {form.category_type && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {form.category_type}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      description
                    </span>
                    {form.fields?.length || 0} fields
                  </span>
                  <span className="font-bold text-primary">Apply Now →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium">
            © 2026 NOLT Finance. All rights reserved.
          </p>
          <p className="mt-2">
            Need help?{" "}
            <a
              href="mailto:support@nolt.finance"
              className="text-primary hover:underline font-bold"
            >
              Contact Support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicFormsView;
