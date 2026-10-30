import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveSession, openSession, getSessionStatus, closeSession, markStudentPresent } from "../services/checkInService";

const LATE_KEY      = "checkin_lateAfterMinutes";
const AUTOCLOSE_KEY = "checkin_autoCloseMinutes";

export default function AttendanceManageModal({ courseId, teacherId, sessionType, courseName, onClose }) {
    const [session, setSession]   = useState(null);
    const [status, setStatus]     = useState(null);
    const [isOpen, setIsOpen]     = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError]       = useState(null);

    // Settings — persisted to localStorage
    const [lateAfterMin,  setLateAfterMin]  = useState(() => localStorage.getItem(LATE_KEY)      || "");
    const [autoCloseMin,  setAutoCloseMin]  = useState(() => localStorage.getItem(AUTOCLOSE_KEY) || "");

    const saveLate = (val) => { setLateAfterMin(val);  localStorage.setItem(LATE_KEY,      val); };
    const saveAutoClose = (val) => { setAutoCloseMin(val); localStorage.setItem(AUTOCLOSE_KEY, val); };

    const lateNum      = lateAfterMin  ? parseInt(lateAfterMin)  : null;
    const autoCloseNum = autoCloseMin  ? parseInt(autoCloseMin)  : null;

    const handleMarkPresent = async (studentId) => {
        if (!session?.id) return;
        try {
            await markStudentPresent(session.id, studentId);
            getSessionStatus(session.id).then(setStatus).catch(() => {});
        } catch {}
    };

    // On mount: check if a session is already active
    useEffect(() => {
        getActiveSession(courseId)
            .then(s => { if (s) { setSession(s); setIsOpen(true); } })
            .catch(() => {});
    }, [courseId]);

    // Poll roster every 5 s while open
    useEffect(() => {
        if (!isOpen || !session?.id) return;
        const poll = () => getSessionStatus(session.id).then(setStatus).catch(() => {});
        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, [isOpen, session?.id]);

    const handleToggle = async () => {
        if (toggling) return;
        setToggling(true);
        setError(null);
        try {
            if (isOpen && session) {
                await closeSession(session.id);
                setIsOpen(false);
            } else {
                const s = await openSession(courseId, teacherId, sessionType, lateNum, autoCloseNum);
                setSession(s);
                setStatus(null);
                setIsOpen(true);
            }
        } catch (e) {
            setError(e.message || "Something went wrong.");
        } finally {
            setToggling(false);
        }
    };

    // When settings change while a session is already open, push the update immediately
    useEffect(() => {
        if (!isOpen || !session?.id) return;
        openSession(courseId, teacherId, sessionType, lateNum, autoCloseNum)
            .then(s => setSession(s))
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lateNum, autoCloseNum]);

    const pct = status
        ? Math.round((status.checkedIn.length / Math.max(status.totalEnrolled, 1)) * 100)
        : 0;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-7 pt-7 pb-5 border-b border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-wider text-brand mb-1">
                        {sessionType} · {courseName}
                    </p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-900">Live Attendance</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 text-sm font-bold"
                        >✕</button>
                    </div>
                </div>

                <div className="px-7 py-6 space-y-6">

                    {/* Session settings */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                                Late After
                            </label>
                            <select
                                value={lateAfterMin}
                                onChange={e => saveLate(e.target.value)}
                                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand transition-colors"
                            >
                                <option value="">No threshold</option>
                                <option value="5">5 minutes</option>
                                <option value="10">10 minutes</option>
                                <option value="15">15 minutes</option>
                                <option value="20">20 minutes</option>
                                <option value="30">30 minutes</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                                Auto-Close
                            </label>
                            <select
                                value={autoCloseMin}
                                onChange={e => saveAutoClose(e.target.value)}
                                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand transition-colors"
                            >
                                <option value="">None</option>
                                <option value="15">After 15 min</option>
                                <option value="30">After 30 min</option>
                                <option value="45">After 45 min</option>
                                <option value="60">After 60 min</option>
                                <option value="90">After 90 min</option>
                            </select>
                        </div>
                    </div>

                    {/* Toggle row */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4">
                        <div>
                            <p className="text-sm font-black text-gray-900">
                                {isOpen ? "Attendance is open" : "Attendance is closed"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {isOpen ? "Students can check in now" : "Toggle to let students check in"}
                            </p>
                        </div>

                        {/* Toggle switch — always clickable, just dims while API call is in-flight */}
                        <button
                            type="button"
                            onClick={handleToggle}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
                                toggling ? "opacity-60 cursor-wait" : "cursor-pointer"
                            } ${isOpen ? "bg-brand" : "bg-gray-300"}`}
                        >
                            <motion.span
                                layout
                                animate={{ x: isOpen ? 29 : 3 }}
                                transition={{ type: "spring", stiffness: 600, damping: 35 }}
                                className="absolute top-[3px] block w-[22px] h-[22px] bg-white rounded-full shadow"
                            />
                        </button>
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 text-center -mt-3">{error}</p>
                    )}

                    {/* Code block */}
                    <div className={`rounded-2xl py-7 text-center transition-colors duration-300 ${isOpen ? "bg-brand" : "bg-gray-100"}`}>
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-4 ${isOpen ? "text-white/50" : "text-gray-400"}`}>
                            Student Check-In Code
                        </p>
                        <AnimatePresence mode="wait">
                            {isOpen && session ? (
                                <motion.p
                                    key="code"
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={{ duration: 0.18 }}
                                    className="text-5xl font-black font-mono text-white tracking-[0.5em] pl-[0.5em]"
                                >
                                    {session.code}
                                </motion.p>
                            ) : (
                                <motion.p
                                    key="closed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-4xl font-mono text-gray-300 tracking-wider"
                                >
                                    — — — —
                                </motion.p>
                            )}
                        </AnimatePresence>
                        {isOpen && (
                            <p className="text-xs text-white/40 mt-4">Share this with your students</p>
                        )}
                    </div>

                    {/* Progress bar */}
                    {status && isOpen && (
                        <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                                <span>{status.checkedIn.length} checked in</span>
                                <span>{pct}% · {status.totalEnrolled} enrolled</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-brand rounded-full"
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Roster */}
                    {status && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                                        Present ({status.checkedIn.length})
                                    </span>
                                </div>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {status.checkedIn.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Waiting…</p>
                                    ) : status.checkedIn.map(s => (
                                        <motion.div
                                            key={s.studentId}
                                            initial={{ opacity: 0, x: -6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-black text-green-700 shrink-0">
                                                {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                                        Not Yet ({status.notCheckedIn.length})
                                    </span>
                                </div>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {status.notCheckedIn.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">All in! 🎉</p>
                                    ) : status.notCheckedIn.map(s => (
                                        <div key={s.studentId} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 group/row">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-black text-gray-400 shrink-0">
                                                {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-400 truncate flex-1">{s.name}</span>
                                            <div className="relative shrink-0">
                                                <button
                                                    onClick={() => handleMarkPresent(s.studentId)}
                                                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-green-500 flex items-center justify-center transition opacity-0 group-hover/row:opacity-100"
                                                >
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    Mark Present
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {isOpen && !status && (
                        <p className="text-xs text-gray-400 text-center">Loading roster…</p>
                    )}

                    {isOpen && session?.autoCloseAt && (
                        <p className="text-[10px] text-center font-semibold text-orange-400">
                            Auto-closes at {new Date(session.autoCloseAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    )}
                    {isOpen && (
                        <p className="text-[10px] text-gray-400 text-center">Roster updates every 5 seconds</p>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
