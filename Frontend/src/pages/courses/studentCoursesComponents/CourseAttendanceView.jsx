import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle, CloseCircle } from "@solar-icons/react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import AttendanceChart from "../../../components/UI/attendanceChart";
import AttendanceVisualizer from "../../../components/UI/attendanceVisualizer";
import { getCourseAttendance } from "../../../services/attendanceService";
import { staggerContainer, slideUp, scaleIn } from "./constants";

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCSV(records, courseName) {
    const header = ["Date", "Session Type", "Time", "Status"];
    const rows = records.map(r => [
        formatDate(r.date),
        r.sessionType || "—",
        r.time || "—",
        r.status,
    ]);
    const csvContent = [header, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${(courseName || "report").toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function CourseAttendanceView({ activeCourseId, subject }) {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!activeCourseId || !user?.userId) return;
        let mounted = true;
        setLoading(true);
        setError(null);
        getCourseAttendance(activeCourseId)
            .then(data => {
                if (!mounted) return;
                setRecords(data.filter(r => r.studentId === user.userId));
            })
            .catch(err => { if (mounted) setError(err.message); })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    const total = records.length;
    const attended = records.filter(r => r.status !== "Absent").length;
    const missed = records.filter(r => r.status === "Absent").length;

    return (
        <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight">Attendance</h1>
                <p className="text-gray-500 mt-2">Academic Presence Tracking</p>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <motion.div variants={scaleIn} className="lg:col-span-2">
                    <AttendanceChart attended={attended} total={total || 1} missed={missed} />
                </motion.div>
                <motion.div variants={scaleIn}>
                    <AttendanceVisualizer sessions={records} />
                </motion.div>
            </div>

            <motion.div variants={slideUp} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Session History</h2>
                    <button
                        onClick={() => downloadCSV(records, subject?.name || subject?.code || activeCourseId)}
                        disabled={records.length === 0}
                        className="text-sm font-semibold text-brand hover:underline flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Download size={15} /> Download Report
                    </button>
                </div>

                {loading ? (
                    <div className="animate-pulse">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-4"><div className="h-2.5 rounded-full bg-gray-200 w-10" /></th>
                                    <th className="px-8 py-4"><div className="h-2.5 rounded-full bg-gray-200 w-24" /></th>
                                    <th className="px-8 py-4"><div className="h-2.5 rounded-full bg-gray-200 w-10" /></th>
                                    <th className="px-8 py-4 text-right"><div className="h-2.5 rounded-full bg-gray-200 w-14 ml-auto" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="border-b border-gray-100">
                                        <td className="px-8 py-6"><div className="h-4 rounded-full bg-gray-100" style={{ width: `${60 + (i * 17) % 40}px` }} /></td>
                                        <td className="px-8 py-6"><div className="h-4 rounded-full bg-gray-100 w-20" /></td>
                                        <td className="px-8 py-6"><div className="h-4 rounded-full bg-gray-100 w-16" /></td>
                                        <td className="px-8 py-6 text-right"><div className="h-5 rounded-full bg-gray-100 w-16 ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : error ? (
                    <div className="px-8 py-12 text-center text-red-400 text-sm">{error}</div>
                ) : records.length === 0 ? (
                    <div className="px-8 py-12 text-center text-gray-400 text-sm">No attendance records yet.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Date</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Session Type</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Time</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((log, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-6 text-sm font-bold text-gray-900">{formatDate(log.date)}</td>
                                    <td className="px-8 py-6 text-sm text-gray-600">{log.sessionType}</td>
                                    <td className="px-8 py-6 text-sm text-gray-400">{log.time ?? "—"}</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${
                                                log.status === "Present" ? "text-green-600" :
                                                log.status === "Late"    ? "text-orange-400" : "text-red-500"
                                            }`}>{log.status}</span>
                                            {log.status === "Present"
                                                ? <CheckCircle className="text-green-600" size={18} />
                                                : <CloseCircle className="text-red-500" size={18} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </motion.div>
        </motion.div>
    );
}
