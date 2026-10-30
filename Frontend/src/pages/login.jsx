import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, ArrowLeft, Eye, EyeOff, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Background from "../assets/backgrounds/background-3.jpeg";
import KoruLogo from "../components/UI/KoruLogo";
import AuthInput from "../components/UI/authInput";
import GoogleAuthButton from "../components/UI/googleAuthButton";
import TwoFactorSetupModal from "../components/UI/TwoFactorSetupModal";
import { loginUser, loginWithGoogle, validate2FA } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

import StudentIcon from "../assets/icons/Student.png";
import TeacherIcon from "../assets/icons/Teacher.png";
import AdminIcon from "../assets/icons/Administrator.png";

const ROLE_CONFIG = {
  student: {
    label: "Student",
    icon: StudentIcon,
    accent: "#3C0078",
    subtitle: "Access your courses, assignments, and grades.",
  },
  teacher: {
    label: "Teacher",
    icon: TeacherIcon,
    accent: "#0369A1",
    subtitle: "Manage your classes, materials, and students.",
  },
  admin: {
    label: "Administrator",
    icon: AdminIcon,
    accent: "#9F1239",
    subtitle: "Oversee the platform, users, and settings.",
  },
};

// Login page – authenticates users with email/password or Google,
// then handles the 2FA challenge and the first-login 2FA setup offer.
export default function Login({ role = "student" }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student;

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // "twoFactor" = showing TOTP code input after credentials accepted
  // "firstLoginPrompt" = offering to enable 2FA after first ever login
  const [step, setStep] = useState("credentials");
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((c) => ({ ...c, [name]: value }));
    if (error) setError("");
  }

  // After credentials or 2FA are validated, check if this is the user's
  // first login. If so, offer 2FA setup before entering the app.
  function afterAuth(userData) {
    // Save the session straight away: the 2FA setup offer below calls the API and needs the token
    saveSession(userData);
    const alreadyPrompted = localStorage.getItem(`twoFactorPrompted_${userData.userId}`);
    if (!alreadyPrompted && !userData.twoFactorEnabled) {
      setPendingUserData(userData);
      setStep("firstLoginPrompt");
    } else {
      navigate("/dashboard");
    }
  }

  function finalizeLogin(userData) {
    saveSession(userData);
    navigate("/dashboard");
  }

  function saveSession(userData) {
    login({
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      profileImageUrl: userData.profileImageUrl,
      twoFactorEnabled: userData.twoFactorEnabled ?? false,
      token: userData.token,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser({
        email: form.email,
        password: form.password,
        expectedRole: role,
      });

      if (data.requiresTwoFactor) {
        setPendingUserId(data.pendingUserId);
        setStep("twoFactor");
        return;
      }

      afterAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setError("");
    setLoading(true);

    try {
      const data = await loginWithGoogle(credential, role);

      if (data.requiresTwoFactor) {
        setPendingUserId(data.pendingUserId);
        setStep("twoFactor");
        return;
      }

      afterAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactorSubmit(event) {
    event.preventDefault();
    setError("");
    setVerifying(true);

    try {
      const data = await validate2FA(pendingUserId, twoFactorCode.trim());
      afterAuth(data);
    } catch (err) {
      setError(err.message);
      setTwoFactorCode("");
    } finally {
      setVerifying(false);
    }
  }

  function handleTwoFactorCodeInput(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTwoFactorCode(val);
    if (error) setError("");
  }

  function dismissFirstLoginPrompt() {
    localStorage.setItem(`twoFactorPrompted_${pendingUserData.userId}`, "1");
    finalizeLogin(pendingUserData);
  }

  function handleSetupComplete() {
    setShowSetupModal(false);
    localStorage.setItem(`twoFactorPrompted_${pendingUserData.userId}`, "1");
    finalizeLogin({ ...pendingUserData, twoFactorEnabled: true });
  }

  return (
    <div
      data-tts-root="true"
      className="fixed inset-0 flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: `url(${Background})`, backgroundSize: "120%" }}
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[3px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[32px] bg-white/95 shadow-2xl backdrop-blur-md relative">
          {/* Back button */}
          {step === "credentials" && (
            <div className="absolute top-4 left-4 z-20">
              <Link
                to="/"
                className="group inline-flex items-center gap-1.5 rounded-full bg-white/90 hover:bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:shadow-sm border border-slate-100/50 transition duration-200"
              >
                <ArrowLeft size={12} className="transition group-hover:-translate-x-0.5" />
                <span>Back</span>
              </Link>
            </div>
          )}

          {/* Header strip */}
          <div
            className="flex flex-col items-center gap-3 px-6 pb-5 pt-8"
            style={{
              background: `linear-gradient(135deg, ${config.accent}15, ${config.accent}08)`,
              borderBottom: `2px solid ${config.accent}20`,
            }}
          >
            <div className="h-16 w-16 flex items-center justify-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
              <KoruLogo />
            </div>
            <div className="text-center mt-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {step === "twoFactor" ? "Two-Factor Auth" : step === "firstLoginPrompt" ? "Secure Your Account" : `${config.label} Login`}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {step === "twoFactor"
                  ? "Enter the code from your authenticator app."
                  : step === "firstLoginPrompt"
                  ? "Add an extra layer of security to your account."
                  : config.subtitle}
              </p>
            </div>
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {step === "credentials" && (
              <motion.form
                key="credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 px-6 pb-8 pt-6 sm:px-8"
              >
                <div className="relative">
                  <AuthInput
                    label="Email address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    id="login-email"
                  />
                </div>

                <div className="relative">
                  <AuthInput
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-[38px] text-slate-400 transition hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  id="login-submit"
                  className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
                  style={{ backgroundColor: config.accent }}
                >
                  <GraduationCap size={18} />
                  <span>{loading ? "Signing in..." : "Let's Learn"}</span>
                </button>


                <GoogleAuthButton
                  text="signin_with"
                  onCredential={handleGoogleLogin}
                  onError={(err) => setError(err.message || "Google sign-in failed.")}
                />
              </motion.form>
            )}

            {step === "twoFactor" && (
              <motion.form
                key="twoFactor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleTwoFactorSubmit}
                className="flex flex-col gap-4 px-6 pb-8 pt-6 sm:px-8"
              >
                <p className="text-sm text-slate-500 text-center">
                  Open your authenticator app and enter the 6-digit code.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={handleTwoFactorCodeInput}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-2xl font-mono tracking-[0.6em] text-gray-900 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 outline-none transition"
                />

                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <button
                  type="submit"
                  disabled={twoFactorCode.length < 6 || verifying}
                  className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: config.accent }}
                >
                  {verifying ? (
                    <><Loader2 size={18} className="animate-spin" /> Verifying…</>
                  ) : (
                    <><ShieldCheck size={18} /> Verify Code</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(""); setTwoFactorCode(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition underline underline-offset-2 text-center"
                >
                  Back to login
                </button>
              </motion.form>
            )}

            {step === "firstLoginPrompt" && (
              <motion.div
                key="firstLoginPrompt"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 px-6 pb-8 pt-6 sm:px-8"
              >
                <p className="text-sm text-slate-500 text-center leading-relaxed">
                  Two-factor authentication adds a one-time code from your phone
                  as a second sign-in step — keeping your account safe even if
                  your password is ever compromised.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-brand hover:bg-brand-deep px-4 py-3 font-semibold text-white transition shadow-md shadow-brand/15"
                  >
                    <ShieldCheck size={18} />
                    Enable 2FA Now
                  </button>

                  <button
                    type="button"
                    onClick={dismissFirstLoginPrompt}
                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 px-4 py-3 font-semibold text-gray-600 transition"
                  >
                    <ShieldOff size={18} />
                    Maybe Later
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  You can always enable this later in Settings → Password & Security.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 2FA setup modal shown from the first-login prompt */}
      <AnimatePresence>
        {showSetupModal && pendingUserData && (
          <TwoFactorSetupModal
            userId={pendingUserData.userId}
            onSuccess={handleSetupComplete}
            onClose={() => setShowSetupModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
