import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Award, FileText } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { getTeacherCourses } from "../../services/courseService";
import { getCourseStudentCount } from "../../services/enrollmentService";
import { getCourseAssignments } from "../../services/assignmentService";
import { getCourseSubmissions } from "../../services/submissionService";
import { getCourseGrades } from "../../services/gradeService";
import { YEARS, SEMESTERS, YEAR_LEVELS } from "./teacherMockData";

/* ─── animation variants ─── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

/* ─── filter select ─── */
function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

/* ─── progress ring ─── */
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

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function TeacherAnalytics() {
  const { user } = useAuth();

  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedSemester, setSelectedSemester] = useState("Semester 1");
  const [selectedYearLevel, setSelectedYearLevel] = useState("All");
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  const [teacherCourses, setTeacherCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCourses() {
      if (!user?.userId) return;
      try {
        const data = await getTeacherCourses(user.userId);
        // Course rows don't carry their enrolments, so ask for each course's head count
        const counts = await Promise.all(
          (data || []).map(c => getCourseStudentCount(c.id).catch(() => 0))
        );
        const mapped = (data || []).map((c, i) => ({
          id: c.id,
          code: c.subject?.code || c.code || "???",
          name: c.subject?.name || c.name || "Course",
          label: c.subject?.code || c.code || "???",
          yearLevel: c.yearLevel || "3rd Year",
          semester: c.term || c.semester || "Semester 1",
          year: String(c.year || c.academicYear || new Date().getFullYear()),
          enrolled: Number(counts[i]) || 0,
          color: "#3C0078",
        }));
        if (mounted) setTeacherCourses(mapped);
      } catch (err) {
        console.error("Failed to load teacher courses:", err);
      }
    }
    fetchCourses();
    return () => { mounted = false; };
  }, [user?.userId]);

  const filteredCourses = useMemo(
    () =>
      teacherCourses.filter(
        c =>
          c.year === selectedYear &&
          c.semester === selectedSemester &&
          (selectedYearLevel === "All" || c.yearLevel === selectedYearLevel)
      ),
    [teacherCourses, selectedYear, selectedSemester, selectedYearLevel]
  );

  const activeCourseIds = useMemo(
    () => selectedCourseId === "all" ? filteredCourses.map(c => c.id) : [selectedCourseId],
    [selectedCourseId, filteredCourses]
  );

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (filteredCourses.length === 0) { setLoading(false); return; }
      try {
        setLoading(true);
        const promises = filteredCourses.map(async c => {
          const [a, s, g] = await Promise.all([
            getCourseAssignments(c.id).catch(() => []),
            getCourseSubmissions(c.id).catch(() => []),
            getCourseGrades(c.id).catch(() => []),
          ]);
          return { assignments: a, submissions: s, grades: g };
        });
        const results = await Promise.all(promises);
        if (mounted) {
          setAssignments(results.flatMap(r => r.assignments));
          setSubmissions(results.flatMap(r => r.submissions));
          setGrades(results.flatMap(r => r.grades));
        }
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [filteredCourses]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => activeCourseIds.includes(a.courseId)).map(a => {
      const subs = submissions.filter(s => s.assignmentId === a.id);
      const gs = grades.filter(g => g.submission?.assignmentId === a.id);
      let avgScore = null;
      if (gs.length > 0) {
        const totalEarned = gs.reduce((acc, g) => acc + (g.pointsEarned || 0), 0);
        const totalMax = gs.reduce((acc, g) => acc + (g.submission?.assignment?.maxPoints || a.maxPoints || 100), 0);
        avgScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
      }
      return {
        ...a,
        totalSubmissions: subs.length,
        graded: gs.length,
        avgScore,
        courseCode: filteredCourses.find(c => c.id === a.courseId)?.label || "???",
      };
    });
  }, [assignments, submissions, grades, activeCourseIds, filteredCourses]);

  const studentRoster = useMemo(() => {
    const studentMap = {};
    submissions
      .filter(s => activeCourseIds.includes(s.assignment?.courseId))
      .forEach(s => {
        const student = s.student;
        if (!student) return;
        if (!studentMap[student.id]) {
          studentMap[student.id] = {
            id: student.id,
            name: student.name || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student",
            email: student.email,
            avatar:
              (student.name || `${student.firstName || ""} ${student.lastName || ""}`)
                .split(" ")
                .filter(Boolean)
                .map(n => n[0])
                .join("")
                .toUpperCase() || "S",
            totalEarned: 0,
            totalMax: 0,
            submissions: 0,
            totalAssignments: filteredAssignments.filter(a => a.courseId === s.assignment?.courseId).length,
          };
        }
        studentMap[student.id].submissions++;
        const grade = grades.find(g => g.submissionId === s.id);
        if (grade && s.assignment) {
          studentMap[student.id].totalEarned += grade.pointsEarned || 0;
          studentMap[student.id].totalMax += s.assignment.maxPoints || 0;
        }
      });
    return Object.values(studentMap).map(s => ({
      ...s,
      avgGrade: s.totalMax > 0 ? Math.round((s.totalEarned / s.totalMax) * 100) : 0,
      status:
        s.totalMax === 0
          ? "Good"
          : s.totalEarned / s.totalMax >= 0.85
          ? "Excellent"
          : s.totalEarned / s.totalMax >= 0.7
          ? "Good"
          : s.totalEarned / s.totalMax >= 0.5
          ? "At Risk"
          : "Critical",
    }));
  }, [submissions, grades, activeCourseIds, filteredAssignments]);

  /* ─── derived stats ─── */
  const gradedAssignments = filteredAssignments.filter(a => a.avgScore !== null);
  const classAvg = gradedAssignments.length
    ? Math.round(gradedAssignments.reduce((s, a) => s + a.avgScore, 0) / gradedAssignments.length)
    : 0;
  const totalStudents =
    filteredCourses.filter(c => activeCourseIds.includes(c.id)).reduce((s, c) => s + (c.enrolled || 0), 0) ||
    studentRoster.length;
  const totalSubs = filteredAssignments.reduce((s, a) => s + a.totalSubmissions, 0);
  const totalGraded = filteredAssignments.reduce((s, a) => s + a.graded, 0);
  const pendingGrading = totalSubs - totalGraded;
  const gradingPct = totalSubs > 0 ? Math.round((totalGraded / totalSubs) * 100) : 0;

  /* ─── SA grade distribution from real data ─── */
  const gradeDistribution = useMemo(() => {
    const bands = [
      { range: "80%+",   count: 0 },
      { range: "70–79%", count: 0 },
      { range: "60–69%", count: 0 },
      { range: "50–59%", count: 0 },
      { range: "<50%",   count: 0 },
    ];
    grades.forEach(g => {
      if (g.pointsEarned == null) return;
      const maxPts = g.submission?.assignment?.maxPoints;
      if (!maxPts) return;
      const pct = (g.pointsEarned / maxPts) * 100;
      if (pct >= 80) bands[0].count++;
      else if (pct >= 70) bands[1].count++;
      else if (pct >= 60) bands[2].count++;
      else if (pct >= 50) bands[3].count++;
      else bands[4].count++;
    });
    return bands;
  }, [grades]);

  return (
    <div className="w-full pb-16">
      <motion.div
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2"
        initial="hidden" animate="visible" variants={stagger}
      >

        {/* ─── Filter Bar ─── */}
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <FilterSelect
              label="Year"
              value={selectedYear}
              options={YEARS.map(String)}
              onChange={v => { setSelectedYear(v); setSelectedCourseId("all"); }}
            />
            <FilterSelect
              label="Semester"
              value={selectedSemester}
              options={SEMESTERS}
              onChange={v => { setSelectedSemester(v); setSelectedCourseId("all"); }}
            />
            <FilterSelect
              label="Level"
              value={selectedYearLevel}
              options={["All", ...YEAR_LEVELS]}
              onChange={v => { setSelectedYearLevel(v); setSelectedCourseId("all"); }}
            />
            <div className="ml-auto flex items-center gap-3 pl-6 border-l border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Course</span>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition cursor-pointer"
              >
                <option value="all">All Courses</option>
                {filteredCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* ─── KPI Row ─── */}
        <motion.div variants={fadeUp} className="flex flex-row divide-x divide-gray-100 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
          {[
            {
              label: "Class Average",
              value: `${classAvg}%`,
              sub: `across ${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""}`,
            },
            { label: "Total Students", value: totalStudents, sub: "enrolled" },
            { label: "Grading Progress", value: `${gradingPct}%`, sub: `${totalGraded} of ${totalSubs} graded` },
            { label: "Pending to Grade", value: pendingGrading, sub: "submissions" },
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

            {/* Course Averages */}
            <motion.div variants={fadeUp}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Course Averages</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {filteredCourses.map(course => {
                  const avg = gradedAssignments.filter(a => a.courseId === course.id);
                  const courseAvg = avg.length ? Math.round(avg.reduce((s, a) => s + a.avgScore, 0) / avg.length) : 0;
                  const isSelected = selectedCourseId === course.id;
                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(isSelected ? "all" : course.id)}
                      className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition ${isSelected ? "border-brand" : "border-gray-200 hover:border-gray-200"}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative shrink-0">
                          <ProgressRing percent={courseAvg} color={course.color} />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">
                            {courseAvg}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{course.code}</p>
                          <p className="text-xs text-gray-400 truncate">{course.name}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{course.enrolled} students</span>
                        <span>{course.yearLevel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Grading Progress Table */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-900">Grading Progress</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {filteredAssignments.length} assignments
                </span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Assignment</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Course</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Graded</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Avg Score</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Due Date</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => {
                    const pct = a.totalSubmissions > 0 ? Math.round((a.graded / a.totalSubmissions) * 100) : 0;
                    const done = a.graded === a.totalSubmissions && a.totalSubmissions > 0;
                    const noGrades = a.avgScore === null;
                    return (
                      <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-sm text-gray-900">{a.title}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-gray-500">{a.courseCode}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-bold text-gray-900">{a.graded}/{a.totalSubmissions}</span>
                            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-[width] ${done ? "bg-green-500" : pct > 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {noGrades
                            ? <span className="text-xs text-gray-300">—</span>
                            : <span className="text-sm font-black text-gray-900">{a.avgScore}%</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(a.dueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            done ? "bg-green-50 text-green-600" :
                            noGrades ? "bg-gray-100 text-gray-400" :
                            "bg-amber-50 text-amber-600"
                          }`}>
                            {done ? "Complete" : noGrades ? "Not Started" : "In Progress"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>

            {/* Student Roster */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-900">Student Performance</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {studentRoster.length} students
                </span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Student</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Avg Grade</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Submitted</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRoster.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600 shrink-0">
                            {s.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-black text-gray-900">{s.avgGrade}%</span>
                          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.avgGrade >= 75 ? "bg-green-500" : s.avgGrade >= 50 ? "bg-orange-400" : "bg-red-500"}`}
                              style={{ width: `${s.avgGrade}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                        {s.submissions}/{s.totalAssignments}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === "Excellent" ? "bg-green-50 text-green-600" :
                          s.status === "Good" ? "bg-blue-50 text-blue-600" :
                          s.status === "At Risk" ? "bg-amber-50 text-amber-600" :
                          "bg-red-50 text-red-600"
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">

            {/* Class Summary */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Class Summary</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-gray-900">{classAvg}%</span>
                <span className="text-sm text-gray-400">class average</span>
              </div>
              <p className="text-xs text-gray-400">
                {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} · {totalStudents} students
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                <Award size={14} className="text-amber-400 shrink-0" />
                <span>{studentRoster.filter(s => s.status === "Excellent").length} students performing excellently</span>
              </div>
            </motion.div>

            {/* Grade Distribution — real SA bands */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Grade Distribution</h3>
              <div className="space-y-2.5">
                {gradeDistribution.map(b => {
                  const maxCount = Math.max(...gradeDistribution.map(d => d.count), 1);
                  return (
                    <div key={b.range} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 w-14 text-right">{b.range}</span>
                      <div className="flex-1 h-4 bg-gray-50 rounded-md overflow-hidden border border-gray-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(b.count / maxCount) * 100}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-full rounded-md bg-brand/20"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-5 text-right">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Grading Queue */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Grading Queue</h3>
              <div className="space-y-2">
                {filteredAssignments.filter(a => a.graded < a.totalSubmissions).map(a => {
                  const remaining = a.totalSubmissions - a.graded;
                  return (
                    <div key={a.id} className="rounded-xl border border-gray-200 p-3.5 flex items-center gap-3 hover:border-gray-200 transition-colors">
                      <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50">
                        <FileText size={15} className="text-amber-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.courseCode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-amber-600">{remaining} left</p>
                      </div>
                    </div>
                  );
                })}
                {filteredAssignments.filter(a => a.graded < a.totalSubmissions).length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    <CheckCircle size={22} className="mx-auto mb-2 text-green-400" />
                    All caught up!
                  </div>
                )}
              </div>
            </motion.div>

            {/* At-Risk Students */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">At-Risk Students</h3>
              <div className="space-y-2">
                {studentRoster
                  .filter(s => s.status === "At Risk" || s.status === "Critical")
                  .map(s => (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                        s.status === "Critical" ? "border-red-100 bg-red-50/30" : "border-amber-100 bg-amber-50/30"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-[10px] text-gray-600 shrink-0">
                        {s.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.submissions}/{s.totalAssignments} submitted</p>
                      </div>
                      <span className={`text-sm font-black ${s.avgGrade < 50 ? "text-red-600" : "text-amber-600"}`}>
                        {s.avgGrade}%
                      </span>
                    </div>
                  ))}
                {studentRoster.filter(s => s.status === "At Risk" || s.status === "Critical").length === 0 && (
                  <p className="text-center py-4 text-sm text-gray-400">No at-risk students</p>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
