
import React, { useState } from 'react';

type SettingsTab = 'Integrations' | 'API & Webhooks';
type EmailMethod = 'SMTP' | 'API';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Integrations');
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [emailMethod, setEmailMethod] = useState<EmailMethod>('SMTP');

  const toggleVisibility = (id: string) => {
    const next = new Set(visibleFields);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleFields(next);
  };

  const IntegrationCard = ({ name, description, icon, status, color }: { name: string, description: string, icon: string, status: 'Connected' | 'Disconnected', color: string }) => (
    <div className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center text-opacity-100`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{status}</span>
        </div>
      </div>
      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{name}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2">
        <button className="flex-1 px-4 py-2 bg-slate-50 dark:bg-background-dark text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">
          View Logs
        </button>
        <button className="flex-1 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors">
          Configure
        </button>
      </div>
    </div>
  );

  const InputField = ({ label, placeholder, isSensitive = false, value, onChange }: { label: string, placeholder: string, isSensitive?: boolean, value?: string, onChange?: (e: any) => void }) => {
    const isVisible = visibleFields.has(label);
    return (
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">{label}</label>
        <div className="relative">
          <input 
            type={isSensitive && !isVisible ? 'password' : 'text'}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-slate-50 dark:bg-background-dark/50 border border-transparent dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-slate-200 transition-all"
          />
          {isSensitive && (
            <button 
              onClick={() => toggleVisibility(label)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold">Manage external connections, security credentials, and system parameters.</p>
        </div>
        <button className="px-8 py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all flex items-center gap-2 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[20px]">save</span>
          Save All Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {(['Integrations', 'API & Webhooks'] as SettingsTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-5 text-xs font-black uppercase tracking-[0.15em] transition-all relative whitespace-nowrap ${
              activeTab === tab 
                ? 'text-primary' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Integrations' && (
        <div className="space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl font-black">verified_user</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">KYC & Identity Verification</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <IntegrationCard 
                name="SmileID" 
                description="Global KYC & identity verification including biometrics and document validation."
                icon="face"
                status="Connected"
                color="bg-emerald-500 text-emerald-500"
              />
              <IntegrationCard 
                name="VerifyMe" 
                description="Address verification and identity matching for Nigerian market standards."
                icon="location_searching"
                status="Disconnected"
                color="bg-blue-500 text-blue-500"
              />
              <IntegrationCard 
                name="Dojo ID" 
                description="Real-time AML screening and Politically Exposed Person (PEP) list integration."
                icon="policy"
                status="Connected"
                color="bg-indigo-500 text-indigo-500"
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl font-black">analytics</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Credit Bureaus</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <IntegrationCard 
                name="CRC Credit Bureau" 
                description="Direct access to credit reports and historical financial reliability data."
                icon="history_edu"
                status="Connected"
                color="bg-purple-500 text-purple-500"
              />
              <IntegrationCard 
                name="FirstCentral" 
                description="Alternate credit scoring and fraud detection metrics for retail lending."
                icon="troubleshoot"
                status="Disconnected"
                color="bg-rose-500 text-rose-500"
              />
              <IntegrationCard 
                name="CreditRegistry" 
                description="Automated credit check during loan application processing."
                icon="inventory"
                status="Disconnected"
                color="bg-amber-500 text-amber-500"
              />
            </div>
          </section>
        </div>
      )}

      {activeTab === 'API & Webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 h-fit">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">key</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Live API Credentials</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">PRODUCTION</span>
            </div>
            <div className="space-y-4">
              <InputField label="Public API Key" placeholder="pk_live_492019..." />
              <InputField label="Secret Key" placeholder="sk_live_••••••••••••" isSensitive />
              <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-blue-600 flex items-center gap-1 transition-all">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Roll Secret Key
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 h-fit">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="material-symbols-outlined text-primary">webhook</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Webhook Configuration</h3>
            </div>
            <div className="space-y-4">
              <InputField label="Webhook Endpoint URL" placeholder="https://your-domain.com/webhooks/nolt" />
              <InputField label="Signing Secret" placeholder="whsec_••••••••••••" isSensitive />
              <div className="flex flex-wrap gap-2 pt-2">
                {['loan.approved', 'investment.matured', 'payment.failed'].map(e => (
                  <span key={e} className="px-3 py-1 bg-slate-100 dark:bg-background-dark/50 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-800">
                    {e}
                    <button className="hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-[14px]">close</span></button>
                  </span>
                ))}
                <button className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-dashed border-primary/30 hover:bg-primary/20 transition-all">+ Add Event</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">mail</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Email Service Integration</h3>
              </div>
              <div className="flex bg-slate-100 dark:bg-background-dark p-1 rounded-xl">
                <button 
                  onClick={() => setEmailMethod('SMTP')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${emailMethod === 'SMTP' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  SMTP
                </button>
                <button 
                  onClick={() => setEmailMethod('API')}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${emailMethod === 'API' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Via API
                </button>
              </div>
            </div>

            {emailMethod === 'SMTP' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
                <InputField label="SMTP Host" placeholder="smtp.gmail.com" />
                <InputField label="SMTP Port" placeholder="587" />
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">Encryption Type</label>
                   <select className="w-full bg-slate-50 dark:bg-background-dark/50 border border-transparent dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-slate-200">
                      <option>None</option>
                      <option>SSL</option>
                      <option>TLS</option>
                      <option selected>STARTTLS</option>
                   </select>
                </div>
                <InputField label="SMTP Username" placeholder="sender@nolt.finance" />
                <InputField label="SMTP Password" placeholder="••••••••••••" isSensitive />
                <InputField label="Sender Name" placeholder="NOLT Finance Alerts" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">API Provider</label>
                   <select className="w-full bg-slate-50 dark:bg-background-dark/50 border border-transparent dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary dark:text-slate-200">
                      <option>SendGrid</option>
                      <option>Mailgun</option>
                      <option>Amazon SES</option>
                      <option>Postmark</option>
                   </select>
                </div>
                <InputField label="API Secret Key" placeholder="SG.••••••••••••" isSensitive />
                <InputField label="Sender Name" placeholder="NOLT Finance Support" />
                <InputField label="Sender Domain" placeholder="mail.nolt.finance" />
                <InputField label="Default Sender Email" placeholder="no-reply@nolt.finance" />
                <InputField label="Reply-To Address" placeholder="support@nolt.finance" />
                <div className="flex items-end pb-1">
                  <button className="w-full px-4 py-3 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                    Test Connection
                  </button>
                </div>
              </div>
            )}
            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">info</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                <span className="text-primary uppercase tracking-tighter">Pro Tip:</span> SMTP is standard for existing mail servers, while API integration offers higher deliverability and granular tracking for transactional system notifications.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
