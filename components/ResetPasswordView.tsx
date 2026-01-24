import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "../utils/authService";
import supabase from "../utils/supabase";

const ResetPasswordView: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Check if we have a valid session (hash fragment from email link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, they might have lost the hash or it expired
                // Redirect to login if absolutely no recovery params are present
                // But typically supabase handles the hash parsing automatically
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const { success: updateSuccess, error: updateError } = await updatePassword(password);

            if (updateError) {
                setError(updateError);
            } else if (updateSuccess) {
                setSuccess(true);
                // Redirect after small delay
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#081016] p-4 font-display">
                <div className="w-full max-w-[480px] z-10">
                    <div className="bg-[#111d26]/80 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/5 overflow-hidden p-12 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-6">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase mb-4">Password Updated</h2>
                        <p className="text-slate-400 font-medium mb-8">
                            Your password has been successfully reset. Redirecting you to login...
                        </p>
                        <button
                            onClick={() => navigate("/login")}
                            className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all uppercase tracking-widest"
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#081016] p-4 font-display">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px]" />
            </div>

            <div className="w-full max-w-[480px] z-10">
                <div className="bg-[#111d26]/80 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/5 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex flex-col items-center mb-10 text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden mb-6 bg-slate-900 border border-white/10">
                                <span className="material-symbols-outlined text-3xl text-white">lock_reset</span>
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                                Set New Password
                            </h1>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
                                Secure your account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        New Password
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

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-[#0a141b] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all text-white placeholder:text-slate-600"
                                    />
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
                                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Update Password"
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordView;
