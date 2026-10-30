import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Volume2,
  Type,
  UserRound,
  KeyRound,
  LogOut,
  Save,
  RotateCcw,
  Sparkles,
  Bell,
  ShieldCheck,
  Palette,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import AuthInput from "../components/UI/authInput";
import TwoFactorSetupModal from "../components/UI/TwoFactorSetupModal";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import {
  changeUserPassword,
  updateUserProfile,
  disable2FA,
} from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const SETTINGS_STORAGE_KEY = "learnonline.settings";

const defaultSettings = {
  font: "Poppins",
  textSize: 100,
  lineSpacing: 150,
  ttsEnabled: false,
  theme: "light",
  reducedMotion: false,
  focusMode: false,
  emailNotifications: true,
  inAppNotifications: true,
  audioCues: false,
};

function ToggleRow({ icon, title, description, checked, onChange }) {
  return (
    <label
      className="flex min-h-[56px] items-center justify-between gap-4 rounded-2xl border p-5 border-gray-100 bg-gray-50/40 hover:bg-gray-50 transition-colors duration-200 cursor-pointer shadow-3xs"
    >
      <div className="flex items-center gap-4">
        <span className="rounded-xl bg-[#3C0078]/5 p-2.5 text-[#3C0078] shrink-0">{icon}</span>
        <div>
          <p className="text-sm font-extrabold text-gray-900 tracking-tight">
            {title}
          </p>
          <p className="text-xs text-gray-505 font-medium mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <span className="relative inline-flex h-7 w-12 items-center shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className={`absolute inset-0 rounded-full transition-colors duration-300 ${checked ? "bg-[#3C0078]" : "bg-gray-200"}`} />
        <span
          className="absolute left-1 h-5 w-5 rounded-full bg-white transition-transform duration-300 shadow-sm"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { user: session, login: updateSession, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    () => session?.twoFactorEnabled ?? false
  );
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
      return saved ? { ...defaultSettings, ...saved } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [profileForm, setProfileForm] = useState({
    firstName: session?.firstName || "",
    lastName: session?.lastName || "",
    email: session?.email || "",
    role: session?.role?.toLowerCase?.() || "student",
  });

  const [selectedAvatar, setSelectedAvatar] = useState(
    session?.profileImageUrl ||
      `https://api.dicebear.com/9.x/thumbs/svg?seed=${session?.userId}`
  );

  const avatarOptions = useMemo(() => {
    const seeds = [
      session?.userId,
      "aurora", "zenith", "nova", "pixel", "cedar",
      "solstice", "marble", "harbor", "summit", "quill", "prism",
    ].filter(Boolean);
    return seeds.map((s) => `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(s)}`);
  }, [session?.userId]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { speak } = useTextToSpeech(settings.ttsEnabled);

  const pageClasses = useMemo(
    () => ({
      wrapper: "text-gray-900 font-sans",
      card: "border border-gray-200/50 bg-white p-6 shadow-2xs rounded-[30px] hover:shadow-xs transition-all duration-300",
      muted: "text-gray-500 font-medium text-xs leading-relaxed",
      secondaryButton: "border-2 border-[#3C0078] bg-white text-[#3C0078] hover:bg-[#3C0078] hover:text-white transition-all rounded-xl",
      select: "border border-gray-200 bg-white text-gray-900 focus:border-[#3C0078]/40 focus:ring-4 focus:ring-[#3C0078]/10 transition-all outline-none rounded-xl px-4 py-2.5 w-full text-sm",
      input: "border border-gray-200 bg-white text-gray-900 focus:border-[#3C0078]/40 focus:ring-4 focus:ring-[#3C0078]/10 transition-all outline-none rounded-xl px-4 py-2.5",
      label: "text-gray-700 font-bold text-xs uppercase tracking-wider mb-1.5 block",
    }),
    [],
  );

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("learnonline-settings-changed"));
    
    document.documentElement.style.fontSize = `${settings.textSize}%`;
    document.body.style.lineHeight = `${settings.lineSpacing / 100}`;

    document.body.classList.toggle("dyslexic-font", settings.font === "OpenDyslexic");
    
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    if (settings.theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    }
    
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion);
    document.body.classList.toggle("focus-mode", settings.focusMode);
  }, [settings]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setSavingProfile(true);

    try {
      const userId = session?.userId;
      const payload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        role: profileForm.role,
        profileImageUrl: selectedAvatar,
      };

      if (userId) {
        const updated = await updateUserProfile(userId, payload);
        updateSession({ ...session, ...updated, role: updated.role || payload.role, profileImageUrl: selectedAvatar });
      } else {
        updateSession({ ...session, ...payload });
      }

      setProfileMessage("Your account details have been updated.");
    } catch (error) {
      setProfileError(error.message || "Unable to save your details.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (!session?.userId) {
      setPasswordError("Please log in again before changing your password.");
      return;
    }

    setSavingPassword(true);

    try {
      const result = await changeUserPassword(session.userId, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage(result.message || "Your password has been changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(error.message || "Unable to change your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  function handleReset() {
    setSettings(defaultSettings);
    setProfileMessage("Accessibility and system settings have been reset to defaults.");
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const categories = [
    {
      id: "profile",
      label: "Account & Profile",
      icon: <UserRound size={15} />,
    },
    {
      id: "security",
      label: "Password & Security",
      icon: <KeyRound size={15} />,
    },
    {
      id: "accessibility",
      label: "Accessibility & Spacing",
      icon: <Sparkles size={15} />,
    },
  ];

  const activeTabLabel = useMemo(() => {
    if (activeTab === "profile") return "Account & Profile";
    if (activeTab === "security") return "Password & Security";
    if (activeTab === "accessibility") return "Accessibility & Spacing";
    return "Settings";
  }, [activeTab]);

  return (
    <div data-tts-root="true" className={`flex overflow-hidden gap-4 transition-all duration-300 md:h-[calc(100vh-32px)] md:w-full max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 bg-transparent ${settings.font === "OpenDyslexic" ? "dyslexic-font" : ""} ${pageClasses.wrapper}`}>
      <div className="flex h-full w-full gap-4 overflow-hidden">
        {/* Left Section: Floating Settings Secondary Navigation (Matching Courses) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col shrink-0 transition-all duration-300
            md:h-full md:w-64 md:bg-white/70 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg md:overflow-hidden
            max-md:h-full max-md:w-64 max-md:bg-white/80 max-md:backdrop-blur-md max-md:border-r max-md:border-gray-200/50"
        >
          {/* Settings Sidebar Header Info */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-100 flex flex-col gap-2 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-[#3C0078]/10 text-[#3C0078] font-black text-[9px] uppercase tracking-wider shadow-sm">
                System
              </span>
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">
                Preferences
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 leading-snug mt-1 truncate">
              Settings
            </h3>
          </div>

          {/* Navigation links */}
          <div className="flex-1 overflow-y-auto pt-4 pb-6 scrollbar-hide">
            <ul className="flex flex-col gap-0.5">
              {categories.map((cat, index) => {
                const isActive = activeTab === cat.id;
                return (
                  <motion.li
                    key={cat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="list-none group relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(cat.id);
                        setProfileMessage("");
                        setPasswordMessage("");
                        setProfileError("");
                        setPasswordError("");
                      }}
                      className={`relative w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-all duration-200 mx-3 my-0.5 rounded-xl group select-none cursor-pointer text-left
                        ${isActive
                          ? "bg-[#3C0078]/5 text-[#3C0078]"
                          : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsLeftAccent"
                          className="absolute left-0 top-1/4 bottom-1/4 w-0.75 bg-[#3C0078] rounded-r-md shrink-0"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                        />
                      )}

                      <span className={`transition-colors shrink-0 ${isActive ? "text-[#3C0078]" : "text-gray-400 group-hover:text-gray-600"}`}>
                        {cat.icon}
                      </span>
                      
                      <span className="flex-1 truncate !text-inherit">{cat.label}</span>

                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsDot"
                          className="w-1.5 h-1.5 rounded-full bg-[#3C0078] shrink-0"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                        />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </motion.div>

        {/* Right Section: Main Content Area: Floating Island Card */}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:bg-white">
          {/* Header Top Bar */}
          <div className="h-14 border-b border-gray-100 bg-white/60 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white bg-[#3C0078] shadow-sm">
                System Settings
              </span>
              <span className="text-gray-300 text-xs">/</span>
              <span className="text-xs font-bold text-gray-500 capitalize">{activeTabLabel}</span>
            </div>
          </div>

          {/* Scrollable View Content */}
          <div className="flex-1 overflow-y-auto pt-8 px-8 pb-12">
            <div className="w-full flex flex-col gap-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  {activeTab === "profile" && (
                    <>
                      <form onSubmit={handleProfileSave} className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><UserRound size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">User Information</h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <AuthInput label="First name" name="firstName" value={profileForm.firstName} onChange={handleProfileChange} labelClassName={pageClasses.label} className={pageClasses.input} required />
                          <AuthInput label="Last name" name="lastName" value={profileForm.lastName} onChange={handleProfileChange} labelClassName={pageClasses.label} className={pageClasses.input} required />
                          <div className="sm:col-span-2">
                            <AuthInput
                              label="Email address"
                              name="email"
                              type="email"
                              value={profileForm.email}
                              onChange={handleProfileChange}
                              labelClassName={pageClasses.label}
                              className={`${pageClasses.input} disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed`}
                              disabled
                              required
                            />
                          </div>
                          {session?.role?.toLowerCase() === "admin" && (
                            <label className="sm:col-span-2 flex flex-col gap-2">
                              <span className={pageClasses.label}>Role</span>
                              <select
                                name="role"
                                value={profileForm.role}
                                onChange={handleProfileChange}
                                className={pageClasses.select}
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                            </label>
                          )}
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-5">
                          <span className={pageClasses.label}>Profile Picture</span>
                          <div className="mt-3 flex flex-wrap gap-2.5">
                            {avatarOptions.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedAvatar(url)}
                                className={`rounded-full overflow-hidden transition-all ${
                                  selectedAvatar === url
                                    ? "ring-2 ring-[#3C0078] ring-offset-2"
                                    : "ring-1 ring-gray-200 hover:ring-gray-400"
                                }`}
                              >
                                <img src={url} alt="" className="h-12 w-12 bg-gray-50" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {profileError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-3xs">{profileError}</div> : null}
                        {profileMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-3xs">{profileMessage}</div> : null}

                        <button type="submit" disabled={savingProfile} className="mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#3C0078] hover:bg-[#2A0054] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#3C0078]/15 transition-all hover:scale-[1.02] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70">
                          <Save size={14} />
                          <span>{savingProfile ? "Saving..." : "Save profile"}</span>
                        </button>
                      </form>

                      {/* Notification Preferences */}
                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><Bell size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Notification Preferences</h2>
                        </div>
                        <p className={`${pageClasses.muted} mb-5`}>
                          Choose how you receive course updates, faculty announcements, and completion audio triggers.
                        </p>
                        
                        <div className="flex flex-col gap-4">
                          <ToggleRow
                            icon={<Bell size={16} />}
                            title="Email Announcements"
                            description="Receive announcements, faculty digests, and critical system updates via email."
                            checked={settings.emailNotifications}
                            onChange={(checked) => updateSetting("emailNotifications", checked)}
                          />
                          
                          <ToggleRow
                            icon={<Sparkles size={16} />}
                            title="In-App Push Alerts"
                            description="Display real-time visual toasts for new grades, assignments, and modules."
                            checked={settings.inAppNotifications}
                            onChange={(checked) => updateSetting("inAppNotifications", checked)}
                          />
                          
                          <ToggleRow
                            icon={<Volume2 size={16} />}
                            title="Audio Completion Cues"
                            description="Play subtle audio chimes when a module item is successfully completed."
                            checked={settings.audioCues}
                            onChange={(checked) => updateSetting("audioCues", checked)}
                          />
                        </div>
                      </div>

                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-red-50 p-2 text-red-600"><LogOut size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Session Management</h2>
                        </div>
                        <p className={pageClasses.muted}>
                          End your current session safely and return to the university onboarding page.
                        </p>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-red-600/15 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <LogOut size={14} />
                          <span>Log out</span>
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === "security" && (
                    <>
                      <form onSubmit={handlePasswordSave} className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><KeyRound size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Change Password</h2>
                        </div>

                        <div className="grid gap-4">
                          <AuthInput label="Current password" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordChange} labelClassName={pageClasses.label} className={pageClasses.input} required />
                          <AuthInput label="New password" name="newPassword" type="password" value={passwordForm.newPassword} onChange={handlePasswordChange} labelClassName={pageClasses.label} className={pageClasses.input} required />
                          <AuthInput label="Confirm new password" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordChange} labelClassName={pageClasses.label} className={pageClasses.input} required />
                        </div>

                        {passwordError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-3xs">{passwordError}</div> : null}
                        {passwordMessage ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-3xs">{passwordMessage}</div> : null}

                        <button type="submit" disabled={savingPassword} className="mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#3C0078] hover:bg-[#2A0054] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#3C0078]/15 transition-all hover:scale-[1.02] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70">
                          <KeyRound size={14} />
                          <span>{savingPassword ? "Updating..." : "Update password"}</span>
                        </button>
                      </form>

                      {/* Multi-Factor Authentication */}
                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><ShieldCheck size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Multi-Factor Authentication</h2>
                        </div>
                        <p className={`${pageClasses.muted} mb-5`}>
                          Secure your university account by adding an additional layer of verification code security.
                        </p>

                        <ToggleRow
                          icon={<ShieldCheck size={16} />}
                          title="Authenticator MFA"
                          description="Use Google Authenticator or any TOTP app to generate login codes."
                          checked={twoFactorEnabled}
                          onChange={(checked) => {
                            setMfaError("");
                            setMfaMessage("");
                            if (checked) {
                              setShowSetup2FA(true);
                            } else {
                              setDisableCode("");
                              setShowDisable2FA(true);
                            }
                          }}
                        />

                        {/* Disable 2FA confirmation form */}
                        {showDisable2FA && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3"
                          >
                            <p className="text-xs font-semibold text-gray-700">
                              Enter your current authenticator code to disable 2FA.
                            </p>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={disableCode}
                              onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setMfaError(""); }}
                              placeholder="000000"
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center font-mono tracking-widest text-gray-900 focus:border-[#3C0078]/40 focus:ring-4 focus:ring-[#3C0078]/10 outline-none transition-all text-lg"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={disableCode.length < 6 || disabling2FA}
                                onClick={async () => {
                                  setDisabling2FA(true);
                                  setMfaError("");
                                  try {
                                    await disable2FA(session.userId, disableCode);
                                    setTwoFactorEnabled(false);
                                    updateUser({ twoFactorEnabled: false });
                                    setMfaMessage("Two-factor authentication has been disabled.");
                                    setShowDisable2FA(false);
                                    setDisableCode("");
                                  } catch (err) {
                                    setMfaError(err.message || "Invalid code.");
                                    setDisableCode("");
                                  } finally {
                                    setDisabling2FA(false);
                                  }
                                }}
                                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-2 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {disabling2FA ? "Disabling…" : "Confirm Disable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowDisable2FA(false); setDisableCode(""); setMfaError(""); }}
                                className="rounded-xl border border-gray-200 bg-white hover:bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {mfaError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-3xs">{mfaError}</div>}
                        {mfaMessage && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-3xs">{mfaMessage}</div>}
                      </div>

                      {/* 2FA Setup Modal */}
                      <AnimatePresence>
                        {showSetup2FA && session?.userId && (
                          <TwoFactorSetupModal
                            userId={session.userId}
                            onSuccess={() => {
                              setShowSetup2FA(false);
                              setTwoFactorEnabled(true);
                              updateUser({ twoFactorEnabled: true });
                              setMfaMessage("Two-factor authentication has been enabled.");
                            }}
                            onClose={() => setShowSetup2FA(false)}
                          />
                        )}
                      </AnimatePresence>
                    </>
                  )}

                  {activeTab === "accessibility" && (
                    <>
                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><Type size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Reading Settings</h2>
                        </div>

                        <div className="mb-6">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Text Size</label>
                            <span className="text-xs font-bold text-[#3C0078]">{settings.textSize}%</span>
                          </div>
                          <input type="range" min="100" max="200" value={settings.textSize} onChange={(e) => updateSetting("textSize", Number(e.target.value))} className="h-2 w-full cursor-pointer accent-[#3C0078]" />
                        </div>

                        <div className="mb-6">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Line Spacing</label>
                            <span className="text-xs font-bold text-[#3C0078]">{settings.lineSpacing}%</span>
                          </div>
                          <input type="range" min="120" max="200" value={settings.lineSpacing} onChange={(e) => updateSetting("lineSpacing", Number(e.target.value))} className="h-2 w-full cursor-pointer accent-[#3C0078]" />
                        </div>

                        <ToggleRow
                          icon={<Type size={16} />}
                          title="Dyslexic Font"
                          description="Switch to OpenDyslexic for improved readability and letter distinction."
                          checked={settings.font === "OpenDyslexic"}
                          onChange={(checked) => updateSetting("font", checked ? "OpenDyslexic" : "Poppins")}
                        />
                      </div>

                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><Volume2 size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Text to Speech</h2>
                        </div>

                        <div className="flex flex-col gap-3">
                          <ToggleRow
                            icon={<Volume2 size={16} />}
                            title="Enable Text-to-Speech"
                            description="Read page content aloud for easier comprehension and reduced reading strain."
                            checked={settings.ttsEnabled}
                            onChange={(checked) => updateSetting("ttsEnabled", checked)}
                          />
                        </div>

                        <button type="button" onClick={() => speak("This is a preview of the text to speech accessibility setting.", { force: true })} className="mt-4 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer">
                          <Volume2 size={14} />
                          <span>Preview voice</span>
                        </button>
                      </div>

                      {/* Visual Style Preferences */}
                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><Palette size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Visual Theme & Style</h2>
                        </div>
                        <p className={`${pageClasses.muted} mb-5`}>
                          Configure themes, optimize motion settings, and enable focus features to minimize reading distractions.
                        </p>

                        <div className="mb-6 flex flex-col gap-2">
                          <span className={pageClasses.label}>Interface Theme Mode</span>
                          <select
                            value={settings.theme}
                            onChange={(e) => updateSetting("theme", e.target.value)}
                            className={pageClasses.select}
                          >
                            <option value="light">☀️ Light Theme</option>
                            <option value="dark">🌙 Dark Theme</option>
                            <option value="system">🖥️ Sync with System</option>
                          </select>
                        </div>

                      </div>

                      <div className={pageClasses.card}>
                        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
                          <span className="rounded-xl bg-[#3C0078]/5 p-2 text-[#3C0078]"><Sparkles size={20} /></span>
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Accessibility Compliance</h2>
                        </div>
                        <ul className="list-none space-y-3.5 text-xs text-gray-500 font-medium">
                          <li className="flex items-start gap-2.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3C0078] mt-1.5 shrink-0" />
                            <span>Buttons and controls use strong color contrast and visible focus states.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3C0078] mt-1.5 shrink-0" />
                            <span>Touch targets are sized for easier clicking and keyboard access.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3C0078] mt-1.5 shrink-0" />
                            <span>Dyslexic-friendly font and spacing controls improve reading comfort.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3C0078] mt-1.5 shrink-0" />
                            <span>Text-to-speech support is available for audio assistance.</span>
                          </li>
                        </ul>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button type="button" onClick={() => setProfileMessage("All settings have been successfully persisted.")} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#3C0078] hover:bg-[#2A0054] px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#3C0078]/20 transition-all hover:scale-[1.02] cursor-pointer">
                            <Save size={14} />
                            <span>Save All Settings</span>
                          </button>
                          <button type="button" onClick={handleReset} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer">
                            <RotateCcw size={14} />
                            <span>Reset to Defaults</span>
                          </button>
                        </div>

                        {profileMessage && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-3xs">{profileMessage}</div>}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
