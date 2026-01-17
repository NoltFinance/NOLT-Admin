
import React, { useState } from 'react';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'signup';
type LoginStep = 'credentials' | 'binding' | '2fa';
type SignupStep = 'details' | 'otp' | 'pending';

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [signupStep, setSignupStep] = useState<SignupStep>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  // Simulate a check for first-time login
  const isFirstTimeUser = (emailAddr: string) => {
    return emailAddr.toLowerCase() === 'new@nolt.finance';
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (isFirstTimeUser(email)) {
        setLoginStep('binding');
      } else {
        setLoginStep('2fa');
      }
    }, 1000);
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 1000);
  };

  const handleBindingConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 1500);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSignupStep('otp');
    }, 1000);
  };

  const handleOTPVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSignupStep('pending');
    }, 1000);
  };

  const resetToLogin = () => {
    setMode('login');
    setLoginStep('credentials');
    setSignupStep('details');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#081016] p-4 font-display">
      {/* Background Decor - Refined for higher contrast dark theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-[480px] z-10">
        <div className="bg-[#111d26]/80 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/5 overflow-hidden transition-all duration-500">
          <div className="p-8 md:p-12">
            {/* Logo & Header */}
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/40 mb-6">
                <span className="material-symbols-outlined text-white text-3xl">account_balance_wallet</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">NOLT Finance</h1>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">LMS Admin Gateway</p>
            </div>

            {mode === 'login' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loginStep === 'credentials' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2 text-center mb-6">
                      <h2 className="text-xl font-black text-white uppercase">Welcome Back</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Enter your credentials to continue</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@nolt.finance"
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                          <input 
                            type={showPassword ? 'text' : 'password'} 
                            required
                            placeholder="••••••••••••"
                            className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Authorize Entry'}
                    </button>

                    <div className="text-center pt-2">
                      <button 
                        type="button" 
                        onClick={() => setMode('signup')}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                      >
                        Don't have an account? <span className="text-primary">Request Access</span>
                      </button>
                    </div>
                  </form>
                ) : loginStep === 'binding' ? (
                  <form onSubmit={handleBindingConfirm} className="space-y-6">
                    <div className="space-y-2 text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">qr_code_2</span>
                      </div>
                      <h2 className="text-xl font-black text-white uppercase">Secure Your Account</h2>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed px-2">This is your first login. Scan the QR code below using the <span className="text-white font-black">Microsoft Authenticator</span> app to link your device.</p>
                    </div>

                    <div className="flex flex-col items-center gap-6 py-4 bg-[#0a141b] rounded-3xl border border-white/5">
                      <div className="p-3 bg-white rounded-2xl shadow-inner">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=otpauth://totp/NOLT:Admin?secret=NOLTPRIVATE&issuer=NOLT%20Finance" 
                          alt="2FA QR Code" 
                          className="w-40 h-40"
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manual Setup Key</p>
                        <code className="text-xs font-black text-primary bg-primary/5 px-3 py-1 rounded-lg select-all">NOLT-PROV-7721-MFA</code>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Enter 6-Digit Code to Confirm</label>
                        <div className="flex justify-center gap-2">
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000000"
                            className="w-full max-w-[200px] text-center tracking-[0.5em] text-2xl font-black bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-700"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                      >
                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Complete Setup & Sign In'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handle2FAVerify} className="space-y-6">
                    <div className="space-y-2 text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">verified_user</span>
                      </div>
                      <h2 className="text-xl font-black text-white uppercase">2FA Verification</h2>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed">Open your <span className="text-white">Microsoft Authenticator</span> app and enter the 6-digit code.</p>
                    </div>

                    <div className="flex justify-center gap-2">
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        className="w-full max-w-[200px] text-center tracking-[0.5em] text-2xl font-black bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-700"
                        required
                        autoFocus
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Sign In'}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setLoginStep('credentials')}
                      className="w-full text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                    >
                      Back to Credentials
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {signupStep === 'details' ? (
                  <form onSubmit={handleSignupSubmit} className="space-y-6">
                    <div className="space-y-2 text-center mb-4">
                      <h2 className="text-xl font-black text-white uppercase">Access Request</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Enter your professional details</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Alex Morgan"
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                        <input 
                          type="email" 
                          required
                          placeholder="alex.m@nolt.finance"
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Department Role</label>
                        <select className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-primary transition-all text-white appearance-none">
                          <option>Sales Officer</option>
                          <option>Sales Manager</option>
                          <option>Credit Manager</option>
                          <option>Customer Experience</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Request'}
                    </button>

                    <div className="text-center pt-2">
                      <button 
                        type="button" 
                        onClick={() => setMode('login')}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                      >
                        Already have an account? <span className="text-primary">Sign In</span>
                      </button>
                    </div>
                  </form>
                ) : signupStep === 'otp' ? (
                  <form onSubmit={handleOTPVerify} className="space-y-6 text-center">
                    <div className="space-y-2 mb-4">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">mail</span>
                      </div>
                      <h2 className="text-xl font-black text-white uppercase">Email Verification</h2>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed px-4">A 4-digit verification code has been sent to your email. Confirm to dispatch request.</p>
                    </div>

                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <input 
                          key={i}
                          type="text" 
                          maxLength={1}
                          className="w-14 h-16 text-center text-2xl font-black bg-[#0a141b] border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary transition-all text-white"
                          required
                          autoFocus={i === 1}
                        />
                      ))}
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Identity'}
                    </button>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Didn't receive code?</p>
                      <button type="button" className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-widest">Resend OTP</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8 text-center animate-in zoom-in-95 duration-500">
                    <div className="relative mx-auto w-24 h-24 mb-6">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                      <div className="relative w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40">
                        <span className="material-symbols-outlined text-4xl">send</span>
                      </div>
                    </div>

                    <div className="space-y-3 px-4">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Request Dispatched</h2>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        Your identity has been verified. A provisioning request has been sent to the <span className="text-white font-black">Super Admin</span> for final approval.
                      </p>
                    </div>

                    <div className="bg-[#0a141b] p-6 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Tracking ID</p>
                      <p className="text-sm font-black text-primary font-mono tracking-wider uppercase">REQ-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={resetToLogin}
                        className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-700 transition-all uppercase tracking-[0.2em]"
                      >
                        Return to Portal
                      </button>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-6 leading-relaxed">
                        You will receive an email once an administrator has provisioned your account permissions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-[#0a141b]/50 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Secure Access Management Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
