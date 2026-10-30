import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { checkIn } from "../services/checkInService";
import { useAuth } from "../contexts/AuthContext";

export default function CheckInModal({ courseName, onClose }) {
    const { user } = useAuth();
    const [digits, setDigits]   = useState(["", "", "", ""]);
    const [error, setError]     = useState(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputs = useRef([]);

    useEffect(() => { inputs.current[0]?.focus(); }, []);

    const handleChange = (idx, value) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        const next = [...digits];
        next[idx] = digit;
        setDigits(next);
        setError(null);
        if (digit && idx < 3) inputs.current[idx + 1]?.focus();
    };

    const handleKeyDown = (idx, e) => {
        if (e.key === "Backspace" && !digits[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    };

    const code = digits.join("");

    // Auto-submit when all 4 digits are entered
    useEffect(() => {
        if (code.length === 4 && !loading && !success) submit(code);
    }, [code]);

    const submit = async (c) => {
        setLoading(true);
        setError(null);
        try {
            await checkIn(c, user.userId);
            setSuccess(true);
            setTimeout(onClose, 1800);
        } catch (err) {
            setError(err.message);
            setDigits(["", "", "", ""]);
            setTimeout(() => inputs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-1">Checked In!</h2>
                            <p className="text-sm text-gray-400">Your attendance has been recorded.</p>
                        </motion.div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <span className="text-[10px] font-black uppercase tracking-wider text-brand">Check In</span>
                                <h2 className="text-2xl font-black text-gray-900 mt-1 leading-tight">{courseName}</h2>
                                <p className="text-sm text-gray-400 mt-1">Enter the 4-digit code from your lecturer</p>
                            </div>

                            {/* 4-box code input */}
                            <div className="flex gap-3 justify-center mb-6">
                                {digits.map((d, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => (inputs.current[idx] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleChange(idx, e.target.value)}
                                        onKeyDown={e => handleKeyDown(idx, e)}
                                        disabled={loading}
                                        className={`w-16 h-16 text-center text-3xl font-black rounded-2xl border-2 outline-none transition
                                            ${d
                                                ? "border-brand bg-brand/5 text-brand"
                                                : "border-gray-200 bg-gray-50 text-gray-900"
                                            }
                                            focus:border-brand focus:bg-brand/5
                                            disabled:opacity-50`}
                                    />
                                ))}
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 text-center mb-4 font-medium">{error}</p>
                            )}

                            <button
                                onClick={() => submit(code)}
                                disabled={code.length !== 4 || loading}
                                className="w-full py-4 rounded-2xl bg-brand text-white font-bold text-sm hover:bg-brand-deep transition disabled:opacity-40"
                            >
                                {loading ? "Checking in…" : "Check In"}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
