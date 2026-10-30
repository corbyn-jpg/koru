import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Award, ChevronUp, ChevronDown } from "lucide-react";
import { getCourseGrades } from "../../../services/gradeService";
import { staggerContainer, slideUp } from "../teacherCoursesComponents/constants";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function pct(points, max) {
  if (!max || max <= 0) return null;
  return Math.round((points / max) * 100);
}

function GradeChip({ points, maxPoints }) {
  const p = pct(points, maxPoints);
  if (p === null) return <span className="text-sm font-bold text-gray-700">{points ?? "—"}</span>;

  const color =
    p >= 75 ? "bg-green-50 text-green-700" :
    p >= 50 ? "bg-amber-50 text-amber-700" :
    "bg-red-50 text-red-600";

  return (
    <span className={`text-xs font-black px-3 py-1 rounded-full ${color}`}>
      {points} / {maxPoints} <span className="opacity-60">({p}%)</span>
    </span>
  );
}

const SORT_OPTIONS = [
  { key: "gradedAt", label: "Date Graded" },
  { key: "studentName", label: "Student" },
  { key: "assignmentTitle", label: "Assignment" },
  { key: "pointsEarned", label: "Score" },
];

export function AdminGradeActivityView({ courseId }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("gradedAt");
  const [sortDir, setSortDir] = useState("desc");

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourseGrades(courseId).catch(() => []);
      setGrades(data || []);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...grades].sort((a, b) => {
    let av, bv;
    switch (sortKey) {
      case "gradedAt":
        av = new Date(a.gradedAt || 0).getTime();
        bv = new Date(b.gradedAt || 0).getTime();
        break;
      case "studentName": {
        const an = a.submission?.student;
        const bn = b.submission?.student;
        av = an ? `${an.firstName} ${an.lastName}`.toLowerCase() : "";
        bv = bn ? `${bn.firstName} ${bn.lastName}`.toLowerCase() : "";
        break;
      }
      case "assignmentTitle":
        av = (a.submission?.assignment?.title || "").toLowerCase();
        bv = (b.submission?.assignment?.title || "").toLowerCase();
        break;
      case "pointsEarned":
        av = a.pointsEarned ?? 0;
        bv = b.pointsEarned ?? 0;
        break;
      default:
        return 0;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ k }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
    ) : null;

  return (
    <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
      <motion.header variants={slideUp} className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Grade Activity</h1>
        <p className="text-gray-500 mt-1 text-sm">{grades.length} graded submissions</p>
      </motion.header>

      <motion.div variants={slideUp} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  {["w-20", "w-16", "w-24", "w-16", "w-16", "w-16"].map((w, i) => (
                    <th key={i} className="px-6 py-4"><div className={`h-2.5 rounded-full bg-gray-200 ${w}`} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-6 py-4"><div className="h-3 rounded-full bg-gray-100 w-28" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                        <div className="h-4 rounded-full bg-gray-200" style={{ width: `${65 + (i * 19) % 40}px` }} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 rounded-full bg-gray-200 mb-1" style={{ width: `${75 + (i * 13) % 50}px` }} />
                      <div className="h-3 rounded-full bg-gray-100 w-16" />
                    </td>
                    <td className="px-6 py-4"><div className="h-5 rounded-full bg-gray-100 w-24" /></td>
                    <td className="px-6 py-4"><div className="h-3 rounded-full bg-gray-100 w-20" /></td>
                    <td className="px-6 py-4"><div className="h-5 rounded-full bg-gray-100 w-10" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <div className="w-14 h-14 rounded-3xl bg-brand/5 flex items-center justify-center mx-auto mb-4">
              <Award size={24} className="text-brand/40" />
            </div>
            <p className="text-gray-500 font-semibold mb-1">No grades recorded yet</p>
            <p className="text-xs text-gray-400">Grades will appear here once teachers start grading submissions.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                {SORT_OPTIONS.map(opt => (
                  <th
                    key={opt.key}
                    onClick={() => handleSort(opt.key)}
                    className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {opt.label} <SortIcon k={opt.key} />
                    </span>
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Graded By</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">Released</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(grade => {
                const student = grade.submission?.student;
                const assignment = grade.submission?.assignment;
                const studentName = student
                  ? `${student.firstName} ${student.lastName}`
                  : "Unknown";
                const initials = student
                  ? `${student.firstName?.[0]}${student.lastName?.[0]}`
                  : "?";

                return (
                  <tr key={grade.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors">
                    {/* Date */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{formatDate(grade.gradedAt)}</span>
                    </td>

                    {/* Student */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand/5 border border-brand/10 flex items-center justify-center text-brand font-black text-[9px] shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">
                          {studentName}
                        </span>
                      </div>
                    </td>

                    {/* Assignment */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-medium truncate max-w-[180px] block">
                        {assignment?.title || "—"}
                      </span>
                      {assignment?.type && (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{assignment.type}</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-6 py-4">
                      <GradeChip
                        points={grade.pointsEarned}
                        maxPoints={assignment?.maxPoints || assignment?.totalPoints}
                      />
                    </td>

                    {/* Graded by */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500 font-medium">{grade.gradedBy || "—"}</span>
                    </td>

                    {/* Released */}
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        grade.isReleased
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {grade.isReleased ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}
