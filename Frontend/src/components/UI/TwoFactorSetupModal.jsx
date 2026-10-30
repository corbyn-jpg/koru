import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Copy, Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setup2FA, enable2FA } from "../../services/authService";

// Modal that guides a user through scanning the QR code and verifying their
// Google Authenticator code to activate 2FA on their account.
export default function TwoFactorSetupModal({ userId, onSuccess, onClose }) {
  const [qrUri, setQrUri] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSetup() {
      try {
        const data = await setup2FA(userId);
        if (!active) return;
        setQrUri(data.qrCodeUri);
        setManualKey(data.manualEntryKey);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to start 2FA setup.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSetup();
    return () => { active = false; };
  }, [userId]);

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length < 6) return;
    setError("");
    setVerifying(true);

    try {
      await enable2FA(userId, code.trim());
      onSuccess();
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(manualKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCodeInput(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (error) setError("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-[28px] bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                Set Up Authenticator
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Google Authenticator or any TOTP app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={28} className="animate-spin text-primary/60" />
            </div>
          ) : (
            <>
              {/* Step 1 – Scan */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Step 1 — Scan the QR code
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-2xl border-2 border-primary/10 bg-white p-3 shadow-xs">
                    {qrUri && <QRCodeSVG value={qrUri} size={160} level="M" />}
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium text-center">
                    Can't scan? Enter the key manually in your app.
                  </p>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition-colors"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span className="font-mono tracking-wider text-[11px]">
                      {manualKey || "—"}
                    </span>
                    <span className="text-gray-400">{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Step 2 – Verify */}
              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Step 2 — Enter the 6-digit code
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={handleCodeInput}
                  placeholder="000000"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-gray-900 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition"
                />

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={code.length < 6 || verifying}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-3 text-sm font-black text-white shadow-md shadow-primary/15 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                  ) : (
                    <><ShieldCheck size={16} /> Enable 2FA</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
