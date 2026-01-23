import React, { useState } from "react";
import {
  signInWithEmail,
  signUpWithEmail,
  verifyOTP,
  sendPasswordResetEmail,
  signInWithMagicLink,
  resendOTP,
  AuthUser,
} from "../utils/authService";

interface AuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = "login" | "signup" | "forgot-password" | "magic-link";
type LoginStep = "credentials" | "2fa";
type SignupStep = "details" | "otp" | "pending";

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("Sales Officer");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        user,
        error: authError,
        requiresOTP,
      } = await signInWithEmail(email, password);

      if (authError) {
        setError(authError);
        setLoading(false);
        return;
      }

      if (requiresOTP) {
        setLoginStep("2fa");
        setLoading(false);
        return;
      }

      if (user) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        success,
        user,
        error: otpError,
      } = await verifyOTP(email, otpCode, "email");

      if (otpError || !success || !user) {
        setError(otpError || "Invalid verification code");
        setLoading(false);
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("OTP verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("Signup with role:", role); // Debug log

    try {
      const {
        success,
        error: signupError,
        requiresOTP,
      } = await signUpWithEmail(email, password, name, role);

      if (signupError) {
        setError(signupError);
        setLoading(false);
        return;
      }

      if (success && requiresOTP) {
        setSignupStep("otp");
        setSuccess("Verification code sent to your email");
      } else if (success) {
        setSignupStep("pending");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        success,
        user,
        error: otpError,
      } = await verifyOTP(email, otpCode, "signup");

      if (otpError || !success) {
        setError(otpError || "Invalid verification code");
        setLoading(false);
        return;
      }

      setSignupStep("pending");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("OTP verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { success, error: resetError } =
        await sendPasswordResetEmail(email);

      if (resetError) {
        setError(resetError);
      } else if (success) {
        setSuccess("Password reset link sent to your email");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Password reset error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { success, error: magicError } = await signInWithMagicLink(email);

      if (magicError) {
        setError(magicError);
      } else if (success) {
        setSuccess("Magic link sent! Check your email to sign in.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Magic link error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const type = signupStep === "otp" ? "signup" : "email_change";
      const { success, error: resendError } = await resendOTP(email, type);

      if (resendError) {
        setError(resendError);
      } else if (success) {
        setSuccess("Verification code resent to your email");
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
      console.error("Resend OTP error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMode("login");
    setLoginStep("credentials");
    setSignupStep("details");
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden mb-6">
                <img
                  src="https://isswlcllytiltgjbysjv.supabase.co/storage/v1/object/public/template-images/logo%20file-02%20(1).png"
                  alt="NOLT Finance Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                NOLT Finance
              </h1>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
                LMS Admin Gateway
              </p>
            </div>

            {mode === "login" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loginStep === "credentials" ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2 text-center mb-6">
                      <h2 className="text-xl font-black text-white uppercase">
                        Welcome Back
                      </h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">
                        Enter your credentials to continue
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Email Address
                        </label>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {showPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-4"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Authorize Entry"
                      )}
                    </button>

                    <div className="text-center pt-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot-password");
                          setError(null);
                          setSuccess(null);
                        }}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors block mx-auto"
                      >
                        Forgot Password?
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                      >
                        Don't have an account?{" "}
                        <span className="text-primary">Request Access</span>
                      </button>
                      <span className="text-slate-700 mx-2">•</span>
                      <button
                        type="button"
                        onClick={() => (window.location.href = "/forms")}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                      >
                        <span className="text-primary">Apply for Services</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handle2FAVerify} className="space-y-6">
                    <div className="space-y-2 text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">
                          verified_user
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white uppercase">
                        2FA Verification
                      </h2>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed">
                        Open your{" "}
                        <span className="text-white">
                          Microsoft Authenticator
                        </span>{" "}
                        app and enter the 6-digit code.
                      </p>
                    </div>

                    <div className="flex justify-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="000000"
                        className="w-full max-w-[200px] text-center tracking-[0.5em] text-2xl font-black bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-700"
                        required
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Verify & Sign In"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep("credentials");
                        setError(null);
                      }}
                      className="w-full text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                    >
                      Back to Credentials
                    </button>
                  </form>
                )}
              </div>
            ) : mode === "forgot-password" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="space-y-2 text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl">
                        lock_reset
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white uppercase">
                      Reset Password
                    </h2>
                    <p className="text-slate-500 text-xs font-bold leading-relaxed px-2">
                      Enter your email address and we'll send you a link to
                      reset your password.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nolt.finance"
                      className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-400 text-xs font-bold text-center">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                  >
                    Back to Login
                  </button>
                </form>
              </div>
            ) : mode === "magic-link" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <form onSubmit={handleMagicLink} className="space-y-6">
                  <div className="space-y-2 text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl">
                        link
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white uppercase">
                      Magic Link
                    </h2>
                    <p className="text-slate-500 text-xs font-bold leading-relaxed px-2">
                      Sign in without a password. We'll send a secure link to
                      your email.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nolt.finance"
                      className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-400 text-xs font-bold text-center">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Send Magic Link"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                  >
                    Back to Login
                  </button>
                </form>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {signupStep === "details" ? (
                  <form onSubmit={handleSignupSubmit} className="space-y-6">
                    <div className="space-y-2 text-center mb-4">
                      <h2 className="text-xl font-black text-white uppercase">
                        Access Request
                      </h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">
                        Enter your professional details
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex.m@nolt.finance"
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Role
                        </label>
                        <select
                          required
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 1rem center",
                            backgroundSize: "1.25rem",
                          }}
                        >
                          <option value="Sales Officer">Sales Officer</option>
                          <option value="Sales Team Lead">
                            Sales Team Lead
                          </option>
                          <option value="Sales Manager">Sales Manager</option>
                          <option value="Customer Experience">
                            Customer Experience
                          </option>
                          <option value="Credit">Credit</option>
                          <option value="Finance">Finance</option>
                          <option value="Internal Control">
                            Internal Control
                          </option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {showPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-400 text-xs font-bold text-center">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Send Request"
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                          setSuccess(null);
                        }}
                        className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                      >
                        Already have an account?{" "}
                        <span className="text-primary">Sign In</span>
                      </button>
                    </div>
                  </form>
                ) : signupStep === "otp" ? (
                  <form
                    onSubmit={handleOTPVerify}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-2 mb-4">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">
                          mail
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white uppercase">
                        Email Verification
                      </h2>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed px-4">
                        A 6-digit verification code has been sent to your email.
                      </p>
                    </div>

                    <div className="flex justify-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="000000"
                        className="w-full max-w-[200px] text-center tracking-[0.5em] text-2xl font-black bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-700"
                        required
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs font-bold text-center">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-400 text-xs font-bold text-center">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Verify Email"
                      )}
                    </button>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Didn't receive code?
                      </p>
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-widest disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8 text-center animate-in zoom-in-95 duration-500">
                    <div className="relative mx-auto w-24 h-24 mb-6">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                      <div className="relative w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40">
                        <span className="material-symbols-outlined text-4xl">
                          send
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 px-4">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                        Request Dispatched
                      </h2>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        Your identity has been verified. A provisioning request
                        has been sent to the{" "}
                        <span className="text-white font-black">
                          Super Admin
                        </span>{" "}
                        for final approval.
                      </p>
                    </div>

                    <div className="bg-[#0a141b] p-6 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Status Tracking ID
                      </p>
                      <p className="text-sm font-black text-primary font-mono tracking-wider uppercase">
                        REQ-
                        {Math.random().toString(36).substring(7).toUpperCase()}
                      </p>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={resetToLogin}
                        className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-700 transition-all uppercase tracking-[0.2em]"
                      >
                        Return to Portal
                      </button>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-6 leading-relaxed">
                        You will receive an email once an administrator has
                        provisioned your account permissions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-[#0a141b]/50 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                shield
              </span>
              Secure Access Management Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
