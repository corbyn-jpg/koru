import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";

const getTimestamp = (record) => {
    if (!record.date) return 0;
    const dateStr = record.date.split("T")[0];
    let timeStr = "00:00";
    if (record.time) {
        const matches = record.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (matches) {
            let hours = parseInt(matches[1], 10);
            const minutes = matches[2];
            const ampm = matches[3];
            
            if (ampm) {
                if (ampm.toUpperCase() === "PM" && hours < 12) {
                    hours += 12;
                } else if (ampm.toUpperCase() === "AM" && hours === 12) {
                    hours = 0;
                }
            }
            timeStr = `${String(hours).padStart(2, "0")}:${minutes.padStart(2, "0")}`;
        }
    }
    return new Date(`${dateStr}T${timeStr}:00`).getTime();
};

export default function StudentAttendanceDetailModal({
    isOpen,
    onClose,
    student,
    records = [],
    onUpdateStatus
}) {
    const [updatingRecordId, setUpdatingRecordId] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen || !student) return null;

    // Filter records for this student and sort descending by date and time (most recent first)
    const studentRecords = records
        .filter(r => r.studentId === student.id)
        .sort((a, b) => getTimestamp(b) - getTimestamp(a));

    // Calculate statistics
    const total = studentRecords.length;
    const present = studentRecords.filter(r => r.status === "Present").length;
    const late = studentRecords.filter(r => r.status === "Late").length;
    const absent = studentRecords.filter(r => r.status === "Absent").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const handleStatusChange = async (recordId, newStatus) => {
        setUpdatingRecordId(recordId);
        setError(null);
        try {
            await onUpdateStatus(recordId, newStatus);
        } catch (err) {
            setError(err.message || "Failed to update record status.");
        } finally {
            setUpdatingRecordId(null);
        }
    };


    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-brand/10 border-2 border-brand/25 flex items-center justify-center font-black text-lg text-brand shadow-sm select-none">
                            {student.avatar}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{student.name}</h2>
                            <p className="text-sm text-gray-500 font-medium mt-0.5">{student.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-[width] text-gray-500"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stats Summary Panel */}
                <div className="px-8 py-6 border-b border-gray-200 bg-white grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Presence Rate</span>
                        <span className={`text-2xl font-black italic ${
                            rate > 85 ? "text-green-600" :
                            rate > 70 ? "text-amber-500" : "text-red-500"
                        }`}>{rate}%</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Present</span>
                        <span className="text-2xl font-black italic text-green-600">{present}</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Late</span>
                        <span className="text-2xl font-black italic text-amber-500">{late}</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 text-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-1">Absent</span>
                        <span className="text-2xl font-black italic text-red-500">{absent}</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-xs font-semibold">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* List Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-4">
                        Attendance History ({total} {total === 1 ? "entry" : "entries"})
                    </h3>

                    {studentRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium">
                            No attendance records recorded for this student.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {studentRecords.map(record => {
                                const isUpdating = updatingRecordId === record.id;

                                return (
                                    <div
                                        key={record.id}
                                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white hover:border-brand/10 hover:shadow-sm transition duration-200"
                                    >
                                        {/* Date and Session Type */}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <span className="text-sm font-bold text-gray-900 block truncate">
                                                {formatDate(record.date)}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                                                    {record.sessionType || "Lecture"}
                                                </span>
                                                {record.time && (
                                                    <span className="text-xs text-gray-400">
                                                        {record.time}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Switcher */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl">
                                                {[
                                                    { label: "Present", colorClass: "text-green-700 bg-green-100 hover:bg-green-200 border-green-200" },
                                                    { label: "Late", colorClass: "text-amber-700 bg-amber-100 hover:bg-amber-200 border-amber-200" },
                                                    { label: "Absent", colorClass: "text-red-700 bg-red-100 hover:bg-red-200 border-red-200" }
                                                ].map(opt => {
                                                    const isActive = record.status === opt.label;
                                                    return (
                                                        <button
                                                            key={opt.label}
                                                            disabled={isUpdating}
                                                            onClick={() => handleStatusChange(record.id, opt.label)}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition duration-200 ${
                                                                isActive
                                                                    ? `${opt.colorClass} shadow-xs`
                                                                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
