import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X, User, BookOpen, Users, GraduationCap, Plus } from "lucide-react";
import { courseService, userService, enrollmentService } from "../../../services/adminService";
import { getCourseLecturers } from "../../../services/courseService";
import { getCourseCohorts } from "../../../services/classGroupService";
import { staggerContainer, slideUp, scaleIn } from "../teacherCoursesComponents/constants";

export function AdminCourseOverviewView({ course, onSaved }) {
  const [teachers, setTeachers] = useState([]);
  const [courseLecturers, setCourseLecturers] = useState([]);
  const [lecturerIds, setLecturerIds] = useState([""]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [studentCount, setStudentCount] = useState(null);
  const [cohortCount, setCohortCount] = useState(null);

  useEffect(() => {
    userService.getTeachers().then(setTeachers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!course) return;
    setForm({
      year: course.year || new Date().getFullYear(),
      capacity: course.capacity || 30,
      isVisible: course.isVisible ?? false,
    });
    setLecturerIds([course.teacherId || ""]);
    setDirty(false);

    enrollmentService.getAllEnrollments()
      .then(all => setStudentCount((all || []).filter(e => e.courseId === course.id || e.course?.id === course.id).length))
      .catch(() => setStudentCount(0));
    getCourseCohorts(course.id).then(c => setCohortCount(c.length)).catch(() => setCohortCount(0));
    getCourseLecturers(course.id).then(l => {
      const loaded = l || [];
      setCourseLecturers(loaded);
      setLecturerIds(loaded.length > 0 ? loaded.map(t => t.id) : [course.teacherId || ""]);
    }).catch(() => {
      setCourseLecturers([]);
    });
  }, [course?.id]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const setLecturerId = (index, value) => {
    setLecturerIds(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setDirty(true);
  };

  const addLecturerRow = () => {
    setLecturerIds(prev => [...prev, ""]);
    setDirty(true);
  };

  const removeLecturerRow = (index) => {
    setLecturerIds(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form || !course) return;
    setSaving(true);
    try {
      await courseService.updateCourse(course.id, {
        subjectId: course.subjectId,
        teacherId: lecturerIds[0] || "",
        term: course.term,
        year: parseInt(form.year),
        capacity: parseInt(form.capacity),
        isVisible: form.isVisible,
      });
      setDirty(false);
      onSaved?.();
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!course) return;
    setForm({
      year: course.year || new Date().getFullYear(),
      capacity: course.capacity || 30,
      isVisible: course.isVisible ?? false,
    });
    setLecturerIds(courseLecturers.length > 0 ? courseLecturers.map(t => t.id) : [course.teacherId || ""]);
    setDirty(false);
  };

  if (!course || !form) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a course to view its overview.
      </div>
    );
  }

  const enrollFill = form.capacity > 0 ? Math.min(Math.round(((studentCount ?? 0) / form.capacity) * 100), 100) : 0;

  const initials = (t) => `${t.firstName?.[0] ?? ""}${t.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
      {/* Header */}
      <motion.header variants={slideUp} className="mb-7 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {course.subject?.code || course.code}
            </span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] font-semibold text-gray-400">{course.term}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] font-semibold text-gray-400">{course.year}</span>
          </div>
          <h1 className="text-2xl font-bold font-['Gabarito'] tracking-tight text-gray-900 leading-tight">
            {course.subject?.name || course.name || "Course Overview"}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {dirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleDiscard}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X size={14} /> Discard
            </motion.button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              dirty
                ? "bg-[#3C0078] text-white hover:bg-[#2a0055] shadow-sm shadow-[#3C0078]/20"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </motion.header>

      {/* Stats strip */}
      <motion.div variants={slideUp} className="grid grid-cols-3 divide-x divide-gray-100 bg-white border border-gray-100 rounded-3xl mb-5 overflow-hidden">
        {[
          { label: "Enrolled", value: studentCount ?? "—", icon: Users },
          { label: "Groups", value: cohortCount ?? "—", icon: GraduationCap },
          { label: "Capacity", value: form.capacity, icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="px-6 py-5 flex items-center gap-4">
            <div className="w-9 h-9 rounded-2xl bg-[#3C0078]/6 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#3C0078]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Enrollment fill bar */}
      {studentCount !== null && (
        <motion.div variants={slideUp} className="mb-5 bg-white border border-gray-100 rounded-3xl px-6 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-gray-500">Enrollment Capacity</p>
            <p className="text-xs font-bold text-gray-900 tabular-nums">{studentCount} / {form.capacity} · {enrollFill}%</p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                enrollFill >= 90 ? "bg-red-400" : enrollFill >= 70 ? "bg-amber-400" : "bg-[#3C0078]"
              }`}
              style={{ width: `${enrollFill}%` }}
            />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Course Settings */}
        <motion.div variants={scaleIn} className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Course Settings</h3>
          </div>
          <div className="px-6 py-5 space-y-4">

            {/* Lecturer rows */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Lecturers
              </label>
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {lecturerIds.map((tid, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <select
                          value={tid}
                          onChange={e => setLecturerId(idx, e.target.value)}
                          className="w-full pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#3C0078]/10 focus:border-[#3C0078]/30 appearance-none cursor-pointer transition-all"
                        >
                          <option value="">No lecturer assigned</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      {lecturerIds.length > 1 && (
                        <button
                          onClick={() => removeLecturerRow(idx)}
                          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors shrink-0"
                          title="Remove lecturer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  onClick={addLecturerRow}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#3C0078]/70 hover:text-[#3C0078] transition-colors pt-0.5 w-fit cursor-pointer"
                >
                  <Plus size={13} />
                  Add another lecturer
                </button>
              </div>
            </div>

            {/* Year + Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Year</label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={form.year}
                  onChange={e => update("year", e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#3C0078]/10 focus:border-[#3C0078]/30 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={form.capacity}
                  onChange={e => update("capacity", e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#3C0078]/10 focus:border-[#3C0078]/30 transition-all"
                />
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">Course Visibility</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {form.isVisible ? "Published — visible to students" : "Draft — hidden from students"}
                </p>
              </div>
              <button
                onClick={() => update("isVisible", !form.isVisible)}
                aria-pressed={form.isVisible}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 cursor-pointer ${
                  form.isVisible ? "bg-[#3C0078]" : "bg-gray-200"
                }`}
              >
                <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.isVisible ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right: Lecturers + Subject */}
        <motion.div variants={scaleIn} className="space-y-4">
          {/* Lecturers card */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lecturers</h3>
            </div>
            <div className="px-6 py-5 flex flex-col gap-2">
              {courseLecturers.length > 0 ? (
                courseLecturers.map(t => (
                  <div key={t.id} className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#3C0078]/4 border border-[#3C0078]/8">
                    <div className="w-10 h-10 rounded-xl bg-[#3C0078] text-white flex items-center justify-center font-bold text-sm shrink-0 select-none">
                      {initials(t)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{t.firstName} {t.lastName}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{t.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">No lecturer assigned to this course.</p>
                </div>
              )}
            </div>
          </div>

          {/* Subject info */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subject</h3>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-gray-400">Code</span>
                <span className="text-xs font-black text-[#3C0078] px-2.5 py-1 rounded-lg bg-[#3C0078]/6">
                  {course.subject?.code || course.code || "—"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-semibold text-gray-400 shrink-0">Name</span>
                <span className="text-sm font-bold text-gray-900 text-right leading-snug">
                  {course.subject?.name || course.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-gray-400">Term</span>
                <span className="text-xs font-semibold text-gray-600 px-2.5 py-1 rounded-lg bg-gray-100">
                  {course.term || "—"}
                </span>
              </div>
              {course.subject?.description && (
                <p className="text-xs text-gray-400 leading-relaxed pt-3 border-t border-gray-100">
                  {course.subject.description}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
