import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Award, ChevronDown, FileText, AlertTriangle
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useCourses } from "../../contexts/CoursesContext";
import { getStudentGrades } from "../../services/gradeService";
import { getStudentSubmissions } from "../../services/submissionService";
import { getCourseAssignments } from "../../services/assignmentService";

/* ──────────────────────────── animation variants ──────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

/* ──────────────────────────── helper components ──────────────────────────── */

function MiniSparkline({ data, color = "#3C0078", height = 40 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRing({ percent, size = 56, stroke = 5, color = "#3C0078" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition duration-700"
      />
    </svg>
  );
}

/* ──────────────────────────── main page ──────────────────────────── */

export default function StudentAnalytics() {
  const { user } = useAuth();
  const { visibleCourses } = useCourses();
  const [gradesData, setGradesData] = useState([]);
  const [submissionsData, setSubmissionsData] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!user?.userId || visibleCourses.length === 0) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [grades, submissions] = await Promise.all([
          getStudentGrades(user.userId),
          getStudentSubmissions(user.userId),
        ]);
        const assignmentPromises = visibleCourses.map(c => getCourseAssignments(c.id).catch(() => []));
        const assignmentsArrays = await Promise.all(assignmentPromises);
        const assignments = assignmentsArrays.flat();
        if (mounted) {
          setGradesData(grades || []);
          setSubmissionsData(submissions || []);
          setAllAssignments(assignments);
        }
      } catch (err) {
        console.error("Failed to load analytics data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [user?.userId, visibleCourses]);

  const monthlyTrendData = useMemo(() => {
    const today = new Date();
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
      return {
        label: d.toLocaleDateString("en-ZA", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        totalEarned: 0,
        totalMax: 0,
      };
    });
    gradesData.forEach(g => {
      if (!g.gradedAt || g.pointsEarned == null || !g.submission?.assignment?.maxPoints) return;
      const date = new Date(g.gradedAt);
      const m = last12Months.find(lm => lm.year === date.getFullYear() && lm.month === date.getMonth());
      if (m) {
        m.totalEarned += g.pointsEarned;
        m.totalMax += g.submission.assignment.maxPoints;
      }
    });
    let lastValue = 0;
    const data = last12Months.map(m => {
      if (m.totalMax > 0) lastValue = Math.round((m.totalEarned / m.totalMax) * 100);
      return lastValue;
    });
    let firstNonZero = data.find(v => v > 0) || 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0) data[i] = firstNonZero;
      else break;
    }
    const allZeros = data.every(v => v === 0);
    return {
      labels: last12Months.map(m => m.label),
      data: allZeros ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : data,
      overallTrend: allZeros ? 0 : data[11] - data[10],
    };
  }, [gradesData]);

  const stats = useMemo(() => {
    let totalPoints = 0;
    let earnedPoints = 0;
    gradesData.forEach(g => {
      if (g.pointsEarned != null && g.submission?.assignment?.maxPoints) {
        totalPoints += g.submission.assignment.maxPoints;
        earnedPoints += g.pointsEarned;
      }
    });
    const pending = submissionsData.filter(s => s.status === "Submitted").length;
    return {
      overallAverage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
      totalGraded: gradesData.length,
      pending,
    };
  }, [gradesData, submissionsData]);

  const coursePerformance = useMemo(() => {
    return visibleCourses.map(course => {
      const courseGrades = gradesData.filter(g => g.submission?.assignment?.courseId === course.id);
      let cTotal = 0;
      let cEarned = 0;
      courseGrades.forEach(g => {
        if (g.pointsEarned != null && g.submission?.assignment?.maxPoints) {
          cTotal += g.submission.assignment.maxPoints;
          cEarned += g.pointsEarned;
        }
      });
      const sortedGrades = [...courseGrades]
        .filter(g => g.pointsEarned != null && g.submission?.assignment?.maxPoints)
        .sort((a, b) => new Date(a.gradedAt) - new Date(b.gradedAt));
      let trend = 0;
      if (sortedGrades.length > 1) {
        const latest = sortedGrades[sortedGrades.length - 1];
        const previous = sortedGrades[sortedGrades.length - 2];
        const latestPct = (latest.pointsEarned / latest.submission.assignment.maxPoints) * 100;
        const prevPct = (previous.pointsEarned / previous.submission.assignment.maxPoints) * 100;
        trend = parseFloat((latestPct - prevPct).toFixed(1));
      }
      return { ...course, average: cTotal > 0 ? Math.round((cEarned / cTotal) * 100) : 0, trend };
    });
  }, [visibleCourses, gradesData]);

  const upcomingAssignments = useMemo(() => {
    return allAssignments
      .filter(a => !submissionsData.some(s => s.assignmentId === a.id))
      .filter(a => new Date(a.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3)
      .map(a => ({ ...a, course: visibleCourses.find(c => c.id === a.courseId)?.label || "Course" }));
  }, [allAssignments, submissionsData, visibleCourses]);

  const recentGrades = useMemo(() => {
    return [...gradesData]
      .sort((a, b) => new Date(b.gradedAt) - new Date(a.gradedAt))
      .slice(0, 6)
      .map(g => ({
        id: g.id,
        course:
          g.submission?.assignment?.course?.label ||
          visibleCourses.find(c => c.id === g.submission?.assignment?.courseId)?.label ||
          "N/A",
        assignment: g.submission?.assignment?.title || "Assignment",
        pointsEarned: g.pointsEarned,
        maxPoints: g.submission?.assignment?.maxPoints || 100,
        gradedAt: g.gradedAt,
        status: "Graded",
      }));
  }, [gradesData, visibleCourses]);

  const highestCourse =
    coursePerformance.length > 0
      ? coursePerformance.reduce((a, b) => (a.average > b.average ? a : b))
      : { average: 0, label: "N/A", subjectName: "None" };

  const submissionsSummary = {
    total: submissionsData.length,
    graded: gradesData.length,
    pending: stats.pending,
    late: submissionsData.filter(s => s.status === "Late").length,
  };

  const feedback = useMemo(() => {
    return gradesData
      .filter(g => g.feedback)
      .sort((a, b) => new Date(b.gradedAt) - new Date(a.gradedAt))
      .slice(0, 3)
      .map(g => ({
        id: g.id,
        assignment: g.submission?.assignment?.title,
        course: visibleCourses.find(c => c.id === g.submission?.assignment?.courseId)?.label,
        teacher: "Teacher",
        content: g.feedback,
        createdAt: g.gradedAt,
      }));
  }, [gradesData, visibleCourses]);

  return (
    <div className="w-full pb-16">
      <motion.div
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2"
        initial="hidden" animate="visible" variants={stagger}
      >

        {/* ─── KPI Row ─── */}
        <motion.div variants={fadeUp} className="flex flex-row divide-x divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          {[
            {
              label: "Overall Average",
              value: `${stats.overallAverage}%`,
              sub:
                monthlyTrendData.overallTrend >= 0
                  ? `↑ ${Math.abs(monthlyTrendData.overallTrend)}% this month`
                  : `↓ ${Math.abs(monthlyTrendData.overallTrend)}% this month`,
            },
            { label: "Courses Enrolled", value: visibleCourses.length, sub: "active courses" },
            { label: "Assignments Graded", value: stats.totalGraded, sub: "all time" },
            { label: "Pending Review", value: submissionsSummary.pending, sub: "awaiting grades" },
          ].map((kpi, i) => (
            <div key={i} className={`flex flex-col gap-1 flex-1 ${i === 0 ? "pr-6" : "px-6"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{kpi.label}</p>
              <p className="text-2xl font-black leading-none text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Main Grid ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* ─── Grade Trend Chart ─── */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Grade Trend</h2>
                  <p className="text-sm text-gray-400">Monthly average over the past year</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${monthlyTrendData.overallTrend >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {monthlyTrendData.overallTrend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {monthlyTrendData.overallTrend >= 0 ? "+" : ""}{monthlyTrendData.overallTrend}%
                </span>
              </div>
              <div className="mt-2">
                <MiniSparkline data={monthlyTrendData.data} color="#3C0078" height={100} />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-300 mt-2 px-1">
                  {monthlyTrendData.labels.map((m, i) => <span key={i}>{m}</span>)}
                </div>
              </div>
            </motion.div>

            {/* ─── Course Performance ─── */}
            <motion.div variants={fadeUp}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Course Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coursePerformance.map(course => {
                  const pct = course.average;
                  const isPositive = course.trend >= 0;
                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <ProgressRing percent={pct} color={course.color || "#3C0078"} />
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">
                          {pct}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{course.subjectName || course.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{course.label} · {course.lecturerName || "Lecturer"}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                        {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {Math.abs(course.trend)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* ─── Recent Grades Table ─── */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-900">Recent Grades</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Last {recentGrades.length} assignments
                </span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Assignment</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Course</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Score</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Date</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrades.map(g => {
                    const pct = g.pointsEarned != null ? Math.round((g.pointsEarned / g.maxPoints) * 100) : 0;
                    return (
                      <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-sm text-gray-900">{g.assignment}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-gray-500">{g.course}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black text-gray-900">{pct}%</span>
                            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-orange-400" : "bg-red-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-400">
                          {g.gradedAt
                            ? new Date(g.gradedAt).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600">
                            {g.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>

          </div>

          {/* ─── Right Sidebar ─── */}
          <div className="flex flex-col gap-5">

            {/* Top Course */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Top Course</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-gray-900">{highestCourse.average}%</span>
                <span className="text-sm text-gray-400 font-medium">{highestCourse.label}</span>
              </div>
              <p className="text-sm font-medium text-gray-600">{highestCourse.subjectName}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <Award size={14} className="text-amber-400 shrink-0" />
                <span>Your highest performing course</span>
              </div>
            </motion.div>

            {/* Submission Breakdown */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Submission Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Graded", value: submissionsSummary.graded, total: submissionsSummary.total, color: "bg-green-500" },
                  { label: "Pending", value: submissionsSummary.pending, total: submissionsSummary.total, color: "bg-amber-400" },
                  { label: "Late", value: submissionsSummary.late, total: submissionsSummary.total, color: "bg-red-400" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.value}/{item.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-[width] duration-700`}
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Upcoming Deadlines</h3>
              <div className="space-y-2">
                {upcomingAssignments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No upcoming deadlines</p>
                ) : (
                  upcomingAssignments.map(a => {
                    const dueDate = new Date(a.dueDate);
                    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                    const urgent = daysLeft <= 7;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-xl border p-4 flex items-center gap-3 ${urgent ? "border-amber-200 bg-amber-50/40" : "border-gray-100"}`}
                      >
                        <span className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${urgent ? "bg-amber-100" : "bg-gray-50"}`}>
                          {urgent
                            ? <AlertTriangle size={16} className="text-amber-600" />
                            : <FileText size={16} className="text-gray-400" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.course} · {a.maxPoints} pts</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-bold ${urgent ? "text-amber-600" : "text-gray-500"}`}>{daysLeft}d</p>
                          <p className="text-[10px] text-gray-400">
                            {dueDate.toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Recent Feedback */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Recent Feedback</h3>
              <div className="space-y-2">
                {feedback.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No feedback yet</p>
                ) : (
                  feedback.map(fb => (
                    <motion.div
                      key={fb.id}
                      layout
                      className="rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors cursor-pointer"
                      onClick={() => setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{fb.assignment}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fb.teacher} · {fb.course}</p>
                        </div>
                        <motion.div animate={{ rotate: expandedFeedback === fb.id ? 180 : 0 }} className="shrink-0 text-gray-300">
                          <ChevronDown size={16} />
                        </motion.div>
                      </div>
                      <AnimatePresence>
                        {expandedFeedback === fb.id && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-sm text-gray-600 mt-3 leading-relaxed overflow-hidden"
                          >
                            "{fb.content}"
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
