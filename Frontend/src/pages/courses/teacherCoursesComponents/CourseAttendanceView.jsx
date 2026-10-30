import React, { useState, useEffect, useMemo } from "react";
import { Folder, Filter } from "@solar-icons/react";
import { X, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AttendanceChart from "../../../components/UI/attendanceChart";
import { getCourseAttendance } from "../../../services/attendanceService";
import { getCourseCohorts, getCourseStudents } from "../../../services/classGroupService";
import CohortFilterBar from "../../../components/CohortFilterBar";
import { staggerContainer, slideUp, scaleIn } from "./constants";

function downloadAttendanceCSV(studentStats, courseName) {
    const header = ["Student Name", "Email", "Sessions Present", "Total Sessions", "Attendance Rate (%)", "Status"];
    const rows = studentStats.map(s => {
        const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
        const status = rate > 85 ? "Excellent" : rate > 75 ? "Good" : rate > 65 ? "At Risk" : "Critical";
        return [s.name, s.email || "—", s.present, s.total, rate, status];
    });
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

function formatSessionDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function CourseAttendanceView({ activeCourseId, subject }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Cohort filter state
    const [cohorts, setCohorts] = useState([]);
    const [studentCohortMap, setStudentCohortMap] = useState({});
    const [selectedCohortId, setSelectedCohortId] = useState(null);

    // Filter/search state
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");


    useEffect(() => {
        if (!activeCourseId) return;
        let mounted = true;
        setLoading(true);
        setSelectedCohortId(null);
        setSelectedStudent(null);
        Promise.all([
            getCourseAttendance(activeCourseId),
            getCourseCohorts(activeCourseId).catch(() => []),
            getCourseStudents(activeCourseId).catch(() => []),
        ]).then(([attendanceData, cohortData, studentData]) => {
            if (!mounted) return;
            setRecords(attendanceData);
            setCohorts(cohortData || []);
            const map = {};
            (studentData || []).forEach(s => { map[s.studentId] = s.classGroupId; });
            setStudentCohortMap(map);
        }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [activeCourseId]);

    // Filter records by selected cohort
    const filteredRecords = selectedCohortId
        ? records.filter(r => studentCohortMap[r.studentId] === selectedCohortId)
        : records;

    // Class-level aggregate
    const total    = filteredRecords.length;
    const attended = filteredRecords.filter(r => r.status !== "Absent").length;
    const missed   = filteredRecords.filter(r => r.status === "Absent").length;

    // Unique session count (by date string)
    const totalSessions = new Set(filteredRecords.map(r => r.date?.split("T")[0])).size;

    // Per-student aggregation
    const studentStats = useMemo(() => {
        const map = {};
        filteredRecords.forEach(r => {
            if (!r.student) return;
            if (!map[r.studentId]) {
                map[r.studentId] = {
                    id:      r.studentId,
                    name:    `${r.student.firstName} ${r.student.lastName}`,
                    email:   r.student.email,
                    avatar:  `${r.student.firstName[0]}${r.student.lastName[0]}`,
                    present: 0,
                    total:   0,
                };
            }
            map[r.studentId].total++;
            if (r.status !== "Absent") map[r.studentId].present++;
        });
        return Object.values(map);
    }, [filteredRecords]);

    const filteredStudentStats = useMemo(() => {
        return studentStats.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
            const rate = student.total > 0 ? Math.round((student.present / student.total) * 100) : 0;
            const status = rate > 85 ? "Excellent" : rate > 75 ? "Good" : rate > 65 ? "At Risk" : "Critical";
            const matchesStatus = statusFilter === "All" || status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [studentStats, searchQuery, statusFilter]);

    const overallRate = total > 0 ? Math.round((attended / total) * 100) : 0;
    const onTrack     = studentStats.filter(s => s.total > 0 && Math.round((s.present / s.total) * 100) >= 80).length;
    const atRisk      = studentStats.length - onTrack;
    const topAttendees = [...studentStats]
        .sort((a, b) => (b.present / (b.total || 1)) - (a.present / (a.total || 1)))
        .slice(0, 10);

    // Per-student session breakdown for the inline panel
    const studentRecords = useMemo(() => {
        if (!selectedStudent) return [];
        return records
            .filter(r => r.studentId === selectedStudent.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [selectedStudent, records]);

    return (
        <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Attendance & Presence</h1>
                    <p className="text-gray-500 mt-2">Academic Presence Analytics</p>
                    <div className="mt-3">
                        <CohortFilterBar cohorts={cohorts} selected={selectedCohortId} onChange={setSelectedCohortId} />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => downloadAttendanceCSV(filteredStudentStats, subject?.name || subject?.code || activeCourseId)}
                        className="px-6 py-3 rounded-2xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                        <Folder size={18} /> Export Log
                    </button>
                    <button className="px-6 py-3 rounded-2xl bg-[#3C0078] text-white text-sm font-semibold shadow-lg shadow-[#3C0078]/20 hover:bg-[#2A0054] transition-all cursor-pointer">
                        Take Attendance
                    </button>
                </div>
            </motion.header>

            {/* KPI summary row */}
            <motion.div variants={slideUp} className="flex flex-row mb-6 divide-x divide-gray-150">
                {[
                    {
                        label: "Overall Rate",
                        value: `${overallRate}%`,
                        sub: `${totalSessions} session${totalSessions !== 1 ? "s" : ""} recorded`,
                    },
                    {
                        label: "On Track",
                        value: `${onTrack}`,
                        sub: `of ${studentStats.length} students · ≥80% threshold`,
                    },
                    {
                        label: "At Risk",
                        value: `${atRisk}`,
                        sub: `student${atRisk !== 1 ? "s" : ""} below 80%`,
                    },
                    {
                        label: "Total Students",
                        value: `${studentStats.length}`,
                        sub: `enrolled in course`,
                    },
                ].map((kpi, i) => (
                    <div key={i} className={`flex flex-col gap-1 py-1 flex-1 ${i === 0 ? "pr-6" : "px-6"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</p>
                        <p className="text-2xl font-black leading-none text-gray-900">{kpi.value}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{kpi.sub}</p>
                    </div>
                ))}
            </motion.div>

            {/* Chart + leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Attendance chart */}
                <motion.div variants={scaleIn} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Class Attendance Overview</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{subject?.code || "Course"} · {totalSessions} sessions recorded</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#3C0078] bg-[#3C0078]/6 px-3 py-1.5 rounded-lg shrink-0">Target 80%</span>
                    </div>
                    <div className="flex-1 min-h-[220px]">
                        <AttendanceChart
                            attended={attended}
                            total={total || 1}
                            missed={missed}
                            centerLabel="Attendance Rate"
                            leftStat="Students"
                            midStat="Present"
                            rightStat="Absent"
                            leftValue={studentStats.length}
                            midValue={attended}
                            rightValue={missed}
                        />
                    </div>
                </motion.div>

                {/* Top attendees leaderboard */}
                <motion.div variants={scaleIn} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                    <div className="mb-5">
                        <h3 className="text-base font-bold text-gray-900">Top Attendance</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Ranked by attendance rate</p>
                    </div>
                    {topAttendees.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-sm text-gray-400">No data yet</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 space-y-3">
                            {topAttendees.map((s, i) => {
                                const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                                return (
                                    <div key={s.id} className="flex items-center gap-3">
                                        <span className={`w-5 text-[11px] font-black text-right shrink-0 ${
                                            i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"
                                        }`}>{i + 1}</span>
                                        <div className="w-7 h-7 rounded-full bg-[#3C0078]/8 border border-[#3C0078]/10 flex items-center justify-center text-[10px] font-black text-[#3C0078] shrink-0">
                                            {s.avatar}
                                        </div>
                                        <span className="flex-1 text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                                        <span className={`text-xs font-black tabular-nums shrink-0 ${
                                            rate >= 90 ? "text-green-600" : rate >= 80 ? "text-[#3C0078]" : "text-orange-500"
                                        }`}>{rate}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Students section — inline split layout */}
            <motion.div variants={slideUp} className="flex flex-row gap-5 items-start mb-8">

                {/* Left: students table — shrinks when panel is open */}
                <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 min-w-0 ${
                    selectedStudent ? "w-[44%] shrink-0" : "w-full"
                }`}>
                    <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Students Attendance</h2>
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${showFilter ? "text-[#3C0078] bg-[#3C0078]/10" : "text-gray-400"}`}
                        >
                            <Filter size={20} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilter && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="px-6 py-4 border-b border-gray-50 bg-gray-50/20 flex flex-col sm:flex-row gap-3 items-center overflow-hidden"
                            >
                                <div className="relative flex-1 w-full">
                                    <input
                                        type="text"
                                        placeholder="Search by student name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#3C0078] focus:ring-1 focus:ring-[#3C0078] transition-all bg-white text-gray-800"
                                    />
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                                    {["All", "Excellent", "Good", "At Risk", "Critical"].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                                statusFilter === status
                                                    ? "bg-[#3C0078] text-white shadow-sm shadow-[#3C0078]/20"
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? (
                        <div className="animate-pulse">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-gray-50/30">
                                        <th className="px-5 py-4"><div className="h-2.5 rounded-full bg-gray-200 w-16" /></th>
                                        <th className="px-4 py-4 text-center"><div className="h-2.5 rounded-full bg-gray-200 w-10 mx-auto" /></th>
                                        <th className="px-4 py-4"><div className="h-2.5 rounded-full bg-gray-200 w-14" /></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className="py-3 pl-5 pr-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                                                    <div className="flex flex-col gap-2">
                                                        <div className="h-3.5 rounded-full bg-gray-200" style={{ width: `${65 + (i * 19) % 45}px` }} />
                                                        <div className="h-2.5 rounded-full bg-gray-100 w-28" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="h-5 rounded-full bg-gray-100 w-10 mx-auto" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-5 rounded-full bg-gray-100 w-16" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : studentStats.length === 0 ? (
                        <div className="px-8 py-12 text-center text-gray-400 text-sm">No attendance records yet.</div>
                    ) : filteredStudentStats.length === 0 ? (
                        <div className="px-8 py-12 text-center text-gray-400 text-sm">No students match your filter criteria.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/30">
                                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Student</th>
                                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Rate</th>
                                    {!selectedStudent && <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudentStats.map(student => {
                                    const rate = student.total > 0 ? Math.round((student.present / student.total) * 100) : 0;
                                    const isActive = selectedStudent?.id === student.id;
                                    return (
                                        <tr
                                            key={student.id}
                                            onClick={() => setSelectedStudent(isActive ? null : student)}
                                            className={`border-b border-gray-50 last:border-0 transition-all cursor-pointer group ${
                                                isActive ? "bg-[#3C0078]/5" : "hover:bg-gray-50/60"
                                            }`}
                                        >
                                            <td className={`py-3 pl-5 pr-3 ${isActive ? "border-l-2 border-[#3C0078]" : ""}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                        isActive
                                                            ? "bg-[#3C0078]/15 border-2 border-[#3C0078]/30 text-[#3C0078]"
                                                            : "bg-[#3C0078]/5 border-2 border-[#3C0078]/10 text-[#3C0078]"
                                                    }`}>
                                                        {student.avatar}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`font-bold text-sm truncate transition-colors ${
                                                            isActive ? "text-[#3C0078]" : "text-gray-900 group-hover:text-[#3C0078]"
                                                        }`}>{student.name}</div>
                                                        {!selectedStudent && (
                                                            <div className="text-xs text-gray-400 mt-0.5 truncate">{student.email}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-base font-black italic text-gray-900">{rate}%</span>
                                            </td>
                                            {!selectedStudent && (
                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        rate > 85 ? "bg-green-100 text-green-700" :
                                                        rate > 75 ? "bg-blue-50 text-blue-700" :
                                                        rate > 65 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"
                                                    }`}>
                                                        {rate > 85 ? "Excellent" : rate > 75 ? "Good" : rate > 65 ? "At Risk" : "Critical"}
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Right: session breakdown panel — slides in as flex sibling */}
                <AnimatePresence mode="wait">
                    {selectedStudent && (
                        <motion.div
                            key="attendance-panel"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, transition: { duration: 0.15, ease: "easeIn" } }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className="flex-1 min-w-0 bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col"
                            style={{ maxHeight: "75vh" }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-[#3C0078]/8 border-2 border-[#3C0078]/15 flex items-center justify-center font-black text-sm text-[#3C0078] shrink-0">
                                        {selectedStudent.avatar}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">{selectedStudent.name}</h2>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedStudent.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-2"
                                    aria-label="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Attendance summary */}
                            <div className="px-5 pt-4 pb-4 border-b border-gray-100 shrink-0">
                                {(() => {
                                    const rate = selectedStudent.total > 0 ? Math.round((selectedStudent.present / selectedStudent.total) * 100) : 0;
                                    const absent = selectedStudent.total - selectedStudent.present;
                                    return (
                                        <>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                                    <span className="text-xl font-black text-gray-900">{rate}%</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Rate</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                                    <span className="text-xl font-black text-gray-900">{selectedStudent.present}</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Present</span>
                                                </div>
                                                <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                                    <span className="text-xl font-black text-gray-900">{absent}</span>
                                                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Absent</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${rate}%`,
                                                        background: rate >= 80 ? "#22c55e" : rate >= 65 ? "#f97316" : "#ef4444"
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1.5">{selectedStudent.present} of {selectedStudent.total} sessions attended</p>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Session list — scrollable */}
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Session History</p>
                                {studentRecords.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <Calendar size={28} className="text-gray-200 mb-2" />
                                        <p className="text-sm font-semibold text-gray-400">No sessions found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {studentRecords.map((rec, idx) => {
                                            const isPresent = rec.status !== "Absent";
                                            const isLate = rec.status === "Late";
                                            return (
                                                <motion.div
                                                    key={rec.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                                                    className="bg-white border border-gray-100 rounded-xl px-3.5 py-3 flex items-center gap-3 hover:border-gray-200 transition-colors"
                                                >
                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                                        isLate ? "bg-orange-50" : isPresent ? "bg-green-50" : "bg-red-50"
                                                    }`}>
                                                        {isLate
                                                            ? <Clock size={11} className="text-orange-500" />
                                                            : isPresent
                                                                ? <CheckCircle2 size={11} className="text-green-500" />
                                                                : <XCircle size={11} className="text-red-400" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-800 leading-tight">
                                                            {formatSessionDate(rec.date)}
                                                        </p>
                                                        {rec.sessionType && (
                                                            <p className="text-[10px] text-gray-400 mt-0.5">{rec.sessionType}</p>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                                        isLate ? "text-orange-500" : isPresent ? "text-green-600" : "text-red-400"
                                                    }`}>
                                                        {rec.status}
                                                    </span>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 shrink-0">
                                <p className="text-[10px] text-gray-400 text-center">Rate = Sessions attended ÷ Total sessions × 100</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
