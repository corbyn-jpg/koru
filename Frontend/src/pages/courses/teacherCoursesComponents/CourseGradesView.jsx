import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, InfoCircle, Filter } from "@solar-icons/react";
import { X, FileText, TrendingUp, Award, AlertCircle } from "lucide-react";
import AttendanceChart from "../../../components/UI/attendanceChart";
import { getCourseGrades } from "../../../services/gradeService";
import { getCourseSubmissions } from "../../../services/submissionService";
import { getCourseCohorts, getCourseStudents } from "../../../services/classGroupService";
import CohortFilterBar from "../../../components/CohortFilterBar";
import { staggerContainer, slideUp, scaleIn } from "./constants";

function downloadGradesCSV(studentRows, courseName) {
    const header = ["Student Name", "Email", "Points Earned", "Max Points", "Average (%)", "Mark Band", "Status"];
    const rows = studentRows.map(r => [
        r.name,
        r.email || "—",
        r.totalEarned,
        r.totalMax,
        r.avgGradePct,
        r.avgGradePct >= 80 ? "80%+" :
        r.avgGradePct >= 70 ? "70–79%" :
        r.avgGradePct >= 60 ? "60–69%" :
        r.avgGradePct >= 50 ? "50–59%" : "<50%",
        r.status,
    ]);
    const csvContent = [header, ...rows]
        // Leading = + - @ would run as a formula in Excel, so neutralise them with a quote
        .map(row => row.map(v => `"${String(v).replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    // The BOM tells Excel the file is UTF-8, so names with accents and the en dashes survive
    const blob = new Blob([String.fromCharCode(0xfeff) + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grades-${(courseName || "report").toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function CourseGradesView({ activeCourseId, subject }) {
    const [grades, setGrades] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cohort filter state
    const [cohorts, setCohorts] = useState([]);
    const [studentCohortMap, setStudentCohortMap] = useState({});
    const [selectedCohortId, setSelectedCohortId] = useState(null);

    // Student report panel
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Filter/search state
    const [showFilter, setShowFilter] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        let mounted = true;
        async function fetchData() {
            if (!activeCourseId) return;
            try {
                setLoading(true);
                setSelectedCohortId(null);
                const [g, s, cohortData, studentData] = await Promise.all([
                    getCourseGrades(activeCourseId).catch(() => []),
                    getCourseSubmissions(activeCourseId).catch(() => []),
                    getCourseCohorts(activeCourseId).catch(() => []),
                    getCourseStudents(activeCourseId).catch(() => []),
                ]);
                if (mounted) {
                    setGrades(g || []);
                    setSubmissions(s || []);
                    setCohorts(cohortData || []);
                    const map = {};
                    (studentData || []).forEach(st => { map[st.studentId] = st.classGroupId; });
                    setStudentCohortMap(map);
                }
            } catch (err) {
                console.error("Failed to load course grades/submissions:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchData();
        return () => { mounted = false; };
    }, [activeCourseId]);

    // Filter submissions by selected cohort
    const filteredSubmissions = useMemo(() => {
        if (!selectedCohortId) return submissions;
        return submissions.filter(s => s.student && studentCohortMap[s.student.id] === selectedCohortId);
    }, [submissions, selectedCohortId, studentCohortMap]);

    const studentRows = useMemo(() => {
        const map = {};
        filteredSubmissions.forEach(s => {
            const student = s.student;
            if (!student) return;
            const sid = student.id;
            if (!map[sid]) {
                const name = student.name || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
                map[sid] = {
                    id: sid,
                    name,
                    email: student.email,
                    avatar: name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || "S",
                    totalEarned: 0,
                    totalMax: 0,
                };
            }
            const grade = grades.find(g => g.submissionId === s.id);
            if (grade && s.assignment) {
                map[sid].totalEarned += (grade.pointsEarned || 0);
                map[sid].totalMax += (s.assignment.maxPoints || 0);
            }
        });
        return Object.values(map).map(r => {
            const pct = r.totalMax > 0 ? Math.round((r.totalEarned / r.totalMax) * 100) : 0;
            return {
                ...r,
                avgGrade: `${pct}%`,
                avgGradePct: pct,
                status: pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "At Risk" : "Critical"
            };
        });
    }, [filteredSubmissions, grades]);

    const filteredStudentRows = useMemo(() => {
        return studentRows.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "All" || student.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [studentRows, searchQuery, statusFilter]);

    // Per-student assignment breakdown for the report panel
    const studentDetail = useMemo(() => {
        if (!selectedStudent) return [];
        const studentSubs = submissions.filter(s => s.student?.id === selectedStudent.id);
        return studentSubs
            .map(s => {
                const grade = grades.find(g => g.submissionId === s.id);
                const maxPts = s.assignment?.maxPoints || 0;
                const earned = grade ? (grade.pointsEarned ?? null) : null;
                const pct = (maxPts > 0 && earned !== null) ? Math.round((earned / maxPts) * 100) : null;
                const due = s.assignment?.dueDate ? new Date(s.assignment.dueDate) : null;
                return {
                    id: s.id,
                    title: s.assignment?.title || "Assignment",
                    maxPoints: maxPts,
                    pointsEarned: earned,
                    percentage: pct,
                    isGraded: !!grade,
                    dueLabel: due ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
                };
            })
            .sort((a, b) => {
                // Graded first, then ungraded
                if (a.isGraded && !b.isGraded) return -1;
                if (!a.isGraded && b.isGraded) return 1;
                return 0;
            });
    }, [selectedStudent, submissions, grades]);

    const classAvg = useMemo(() => {
        if (studentRows.length === 0) return 0;
        return Math.round(studentRows.reduce((s, r) => s + r.avgGradePct, 0) / studentRows.length);
    }, [studentRows]);

    const aboveTarget = studentRows.filter(r => r.avgGradePct >= 75).length;
    const belowTarget = studentRows.length - aboveTarget;
    const aboveTargetPct = studentRows.length > 0 ? Math.round((aboveTarget / studentRows.length) * 100) : 0;
    const topStudent = studentRows.length > 0 ? studentRows.reduce((a, b) => a.avgGradePct > b.avgGradePct ? a : b) : null;
    const lowestStudent = studentRows.length > 0 ? studentRows.reduce((a, b) => a.avgGradePct < b.avgGradePct ? a : b) : null;
    const topPerformers = [...studentRows].sort((a, b) => b.avgGradePct - a.avgGradePct).slice(0, 10);
    const gradeBreakdown = [
        { label: "80%+",   count: studentRows.filter(r => r.avgGradePct >= 80).length },
        { label: "70–79%", count: studentRows.filter(r => r.avgGradePct >= 70 && r.avgGradePct < 80).length },
        { label: "60–69%", count: studentRows.filter(r => r.avgGradePct >= 60 && r.avgGradePct < 70).length },
        { label: "50–59%", count: studentRows.filter(r => r.avgGradePct >= 50 && r.avgGradePct < 60).length },
        { label: "<50%",   count: studentRows.filter(r => r.avgGradePct < 50).length },
    ];

    function gradeBand(pct) {
        if (pct === null) return "—";
        if (pct >= 80) return "80%+";
        if (pct >= 70) return "70–79%";
        if (pct >= 60) return "60–69%";
        if (pct >= 50) return "50–59%";
        return "<50%";
    }

    return (
            <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.header variants={slideUp} className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Grades & Performance</h1>
                        <p className="text-gray-500 mt-2">{subject?.code || "Course"} | Class Performance Analytics</p>
                        <div className="mt-3">
                            <CohortFilterBar cohorts={cohorts} selected={selectedCohortId} onChange={setSelectedCohortId} />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => downloadGradesCSV(filteredStudentRows, subject?.name || subject?.code || activeCourseId)}
                            className="px-6 py-3 rounded-2xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                            <Folder size={18} /> Export CSV
                        </button>
                    </div>
                </motion.header>

                {/* KPI summary row */}
                <motion.div variants={slideUp} className="flex flex-row mb-6 divide-x divide-gray-150">
                    {[
                        {
                            label: "Class Average",
                            value: `${classAvg}%`,
                            sub: `${studentRows.length} student${studentRows.length !== 1 ? "s" : ""} enrolled`,
                        },
                        {
                            label: "Above Target",
                            value: `${aboveTargetPct}%`,
                            sub: `${aboveTarget} of ${studentRows.length} · 75% pass mark`,
                        },
                        {
                            label: "Top Score",
                            value: topStudent ? `${topStudent.avgGradePct}%` : "—",
                            sub: topStudent?.name || "No submissions yet",
                        },
                        {
                            label: "Needs Attention",
                            value: `${belowTarget}`,
                            sub: `student${belowTarget !== 1 ? "s" : ""} below 75%`,
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`flex flex-col gap-1 py-1 flex-1 ${i === 0 ? "pr-6" : "px-6"}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{kpi.label}</p>
                            <p className="text-2xl font-black leading-none text-gray-900">{kpi.value}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{kpi.sub}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Chart + leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                    {/* Distribution chart */}
                    <motion.div variants={scaleIn} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Grade Distribution</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{subject?.code || "Course"} · All assignments</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/6 px-3 py-1.5 rounded-lg shrink-0">Target 75%</span>
                        </div>

                        {/* Grade band breakdown */}
                        <div className="grid grid-cols-5 gap-3 mb-5 pb-5 border-b border-gray-50">
                            {gradeBreakdown.map(({ label, count }) => {
                                const pct = studentRows.length > 0 ? Math.round((count / studentRows.length) * 100) : 0;
                                return (
                                    <div key={label} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-gray-500 leading-tight">{label}</span>
                                            <span className="text-xs font-black text-gray-800">{pct}%</span>
                                        </div>
                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-brand/40"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400">{count} student{count !== 1 ? "s" : ""}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex-1 min-h-[200px]">
                            <AttendanceChart
                                attended={classAvg}
                                total={100}
                                missed={100 - classAvg}
                                centerLabel="Class Average"
                                leftStat="Students"
                                midStat="Above 75%"
                                rightStat="Below 75%"
                                leftValue={studentRows.length}
                                midValue={aboveTarget}
                                rightValue={belowTarget}
                            />
                        </div>
                    </motion.div>

                    {/* Top performers */}
                    <motion.div variants={scaleIn} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                        <div className="mb-5">
                            <h3 className="text-base font-bold text-gray-900">Top Performers</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Ranked by average grade</p>
                        </div>
                        {topPerformers.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-sm text-gray-400">No data yet</p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 space-y-3">
                                {topPerformers.map((s, i) => (
                                    <div key={s.id} className="flex items-center gap-3">
                                        <span className={`w-5 text-[11px] font-black text-right shrink-0 ${
                                            i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"
                                        }`}>{i + 1}</span>
                                        <div className="w-7 h-7 rounded-full bg-brand/8 border border-brand/10 flex items-center justify-center text-[10px] font-black text-brand shrink-0">
                                            {s.avatar}
                                        </div>
                                        <span className="flex-1 text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                                        <span className={`text-xs font-black tabular-nums shrink-0 ${
                                            s.avgGradePct >= 90 ? "text-green-600" : s.avgGradePct >= 75 ? "text-brand" : "text-orange-500"
                                        }`}>{s.avgGradePct}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Students section — inline split layout, no overlay */}
                <motion.div variants={slideUp} className="flex flex-row gap-5 items-start mb-8">

                    {/* Left: students table — shrinks when panel is open */}
                    <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition duration-300 min-w-0 ${
                        selectedStudent ? "w-[44%] shrink-0" : "w-full"
                    }`}>
                        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Students List</h2>
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${showFilter ? "text-brand bg-brand/10" : "text-gray-400"}`}
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
                                            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition bg-white text-gray-800"
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
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                                                    statusFilter === status
                                                        ? "bg-brand text-white shadow-sm shadow-brand/20"
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
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/30">
                                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Student</th>
                                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Grade</th>
                                    {!selectedStudent && <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {studentRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={selectedStudent ? 2 : 3} className="px-8 py-12 text-center text-gray-400 text-sm">
                                            No student grade records yet.
                                        </td>
                                    </tr>
                                ) : filteredStudentRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={selectedStudent ? 2 : 3} className="px-8 py-12 text-center text-gray-400 text-sm">
                                            No students match your filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudentRows.map((student) => {
                                        const isActive = selectedStudent?.id === student.id;
                                        return (
                                            <tr
                                                key={student.id}
                                                onClick={() => setSelectedStudent(isActive ? null : student)}
                                                className={`border-b border-gray-50 last:border-0 transition cursor-pointer group ${
                                                    isActive
                                                        ? "bg-brand/5"
                                                        : "hover:bg-gray-50/60"
                                                }`}
                                            >
                                                <td className={`py-3 pl-5 pr-3 ${isActive ? "border-l-2 border-brand" : ""}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                            isActive
                                                                ? "bg-brand/15 border-2 border-brand/30 text-brand"
                                                                : "bg-brand/5 border-2 border-brand/10 text-brand"
                                                        }`}>
                                                            {student.avatar}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className={`font-bold text-sm truncate transition-colors ${
                                                                isActive ? "text-brand" : "text-gray-900 group-hover:text-brand"
                                                            }`}>{student.name}</div>
                                                            {!selectedStudent && (
                                                                <div className="text-xs text-gray-400 mt-0.5 truncate">{student.email}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-base font-black italic text-gray-900">{student.avgGrade}</span>
                                                </td>
                                                {!selectedStudent && (
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            student.status === "Excellent" ? "bg-green-100 text-green-700" :
                                                            student.status === "Good" ? "bg-blue-50 text-blue-700" :
                                                            student.status === "At Risk" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"
                                                        }`}>
                                                            {student.status}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Right: report panel — slides in as a flex sibling */}
                    <AnimatePresence mode="wait">
                        {selectedStudent && (
                            <motion.div
                                key="report-panel"
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
                                        <div className="w-9 h-9 rounded-full bg-brand/8 border-2 border-brand/15 flex items-center justify-center font-black text-sm text-brand shrink-0">
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

                                {/* Grade summary */}
                                <div className="px-5 pt-4 pb-4 border-b border-gray-100 shrink-0">
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                            <span className="text-xl font-black text-gray-900">{selectedStudent.avgGrade}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Overall</span>
                                        </div>
                                        <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                            <span className="text-xl font-black text-gray-900">{gradeBand(selectedStudent.avgGradePct)}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Mark Band</span>
                                        </div>
                                        <div className="flex flex-col items-center bg-gray-50 rounded-2xl py-3">
                                            <span className="text-xl font-black text-gray-900">{studentDetail.filter(d => d.isGraded).length}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold mt-0.5">Graded</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                                            <TrendingUp size={12} className="text-gray-400 shrink-0" />
                                            <span className="truncate">
                                                <span className="font-bold text-gray-800">{selectedStudent.totalEarned}</span>
                                                <span className="text-gray-400"> / </span>
                                                <span className="font-bold text-gray-800">{selectedStudent.totalMax}</span>
                                                <span className="text-gray-400"> pts</span>
                                            </span>
                                        </div>
                                        <span className="text-xs font-black text-brand shrink-0">= {selectedStudent.avgGrade}</span>
                                    </div>
                                </div>

                                {/* Assignment list — scrollable */}
                                <div className="flex-1 overflow-y-auto px-5 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Assignments</p>
                                    {studentDetail.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <FileText size={28} className="text-gray-200 mb-2" />
                                            <p className="text-sm font-semibold text-gray-400">No submissions found</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {studentDetail.map((item, idx) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                                                    className="bg-white border border-gray-100 rounded-xl px-3.5 py-3 hover:border-gray-200 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <div className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                                                {item.isGraded
                                                                    ? <Award size={11} className="text-gray-500" />
                                                                    : <AlertCircle size={11} className="text-gray-300" />
                                                                }
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{item.title}</p>
                                                                {item.dueLabel && <p className="text-[10px] text-gray-400 mt-0.5">Due {item.dueLabel}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            {item.isGraded ? (
                                                                <>
                                                                    <p className="text-xs font-black text-gray-900">
                                                                        {item.pointsEarned ?? "—"}<span className="text-gray-400 font-semibold"> / {item.maxPoints}</span>
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-gray-500">{item.percentage}%</p>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-300 uppercase">Pending</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.isGraded && item.percentage !== null && (
                                                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                className="h-full rounded-full"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${item.percentage}%` }}
                                                                transition={{ delay: idx * 0.04 + 0.15, duration: 0.5, ease: "easeOut" }}
                                                                style={{
                                                                    background: item.percentage >= 85 ? "#22c55e"
                                                                        : item.percentage >= 70 ? "#64748b"
                                                                        : item.percentage >= 50 ? "#f97316"
                                                                        : "#ef4444"
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 border-t border-gray-100 shrink-0">
                                    <p className="text-[10px] text-gray-400 text-center">Grade = Points earned ÷ Max points × 100</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
    );
}
