import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import TeacherPerspectiveModal from "./TeacherPerspectiveModal";
import StudentPerspectiveModal from "./StudentPerspectiveModal";
import CohortManagerModal from "./CohortManagerModal";

const DEGREES = [
  "UX Design Degree",
  "Software Engineering Degree",
  "Visual Arts Degree",
  "Interaction Design Degree",
  "Design Leadership Degree"
];

export default function CourseDetailModal({ 
  course, 
  onClose, 
  isEditing, 
  setIsEditing, 
  editForm, 
  setEditForm, 
  teachers, 
  onSave, 
  onDelete 
}) {
  const [showTeacherPreview, setShowTeacherPreview] = useState(false);
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [showCohortManager, setShowCohortManager] = useState(false);

  if (!course) return null;

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-3xl w-[80vw] max-w-[1400px] shadow-3xl overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Left Column: Core Info & Main Meta */}
            <div className="p-8 md:w-2/5 bg-gray-50/50 border-r border-gray-100 flex flex-col justify-between">
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      {isEditing ? (
                        <input 
                          value={editForm.subject.code}
                          onChange={(e) => setEditForm({...editForm, subject: {...editForm.subject, code: e.target.value}})}
                          className="px-3 py-1 w-24 rounded-full bg-white border border-brand/20 text-[10px] font-black text-brand uppercase tracking-wider outline-none"
                        />
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-brand/5 text-[10px] font-black text-brand uppercase tracking-wider">{course.subject.code}</span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        (isEditing ? editForm.status : course.status) === "Active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      }`}>
                        {isEditing ? editForm.status : course.status}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <input 
                          value={editForm.subject.name}
                          onChange={(e) => setEditForm({...editForm, subject: {...editForm.subject, name: e.target.value}})}
                          className="w-full text-5xl font-black text-gray-900 tracking-tighter bg-transparent border-b-2 border-brand/10 focus:border-brand outline-none pb-1"
                        />
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">{editForm.year}{editForm.year===1 ? "st" : editForm.year===2 ? "nd" : editForm.year===3 ? "rd" : "th"} Year Registry</span>
                          <span className="px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">{editForm.term}</span>
                        </div>
                      </div>
                    ) : (
                      <h2 className="text-5xl font-black text-gray-900 tracking-tighter leading-tight">{course.subject.name}</h2>
                    )}

                    <div className="mt-8 p-6 rounded-3xl bg-brand/5 border border-brand/10">
                      <label className="text-[10px] font-black text-brand uppercase tracking-wider block mb-2">Degree Assignment</label>
                      {isEditing ? (
                        <select 
                          value={editForm.degree}
                          onChange={(e) => setEditForm({...editForm, degree: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-white border border-gray-100 text-[13px] font-bold outline-none appearance-none"
                        >
                          {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <p className="text-[14px] font-black text-gray-900 uppercase tracking-wider">{course.degree}</p>
                      )}
                      <p className="mt-3 text-[11px] font-medium text-gray-500 leading-relaxed italic">
                        * All students enrolled in this degree program will be automatically assigned to this module.
                      </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-4">Assigned Faculty</label>
                        <div className="flex items-center justify-between">
                          {isEditing ? (
                            <div className="flex-1">
                              <select 
                                value={editForm.teacherId}
                                onChange={(e) => {
                                  setEditForm({...editForm, teacherId: e.target.value});
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-[13px] font-bold outline-none"
                              >
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                              </select>
                            </div>
                          ) : (
                             <div className="flex items-center gap-4 w-full">
                              <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center font-black text-lg shadow-lg shadow-brand/20">
                                {course?.teacher?.firstName?.[0] || "?"}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[14px] font-black text-gray-900">
                                  {course?.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : "No Teacher Assigned"}
                                </h4>
                                <p className="text-[10px] font-bold text-gray-400">{course?.teacher?.email || "N/A"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Registry Status</label>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[12px] font-black uppercase tracking-wider ${
                            (isEditing ? editForm?.status : course?.status) === "Active" ? "text-green-600" : "text-red-500"
                          }`}>
                            {isEditing ? editForm?.status : (course?.status || "Active")}
                          </span>
                          {isEditing && (
                            <button 
                              onClick={() => setEditForm({...editForm, status: editForm.status === "Active" ? "Inactive" : "Active"})}
                              className={`w-12 h-6 rounded-full transition relative ${editForm.status === "Active" ? "bg-green-500" : "bg-gray-300"}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${editForm.status === "Active" ? "right-1" : "left-1"}`}></div>
                            </button>
                          )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Narrative & Actions */}
            <div className="p-10 md:w-3/5 flex flex-col justify-between">
                <button onClick={onClose} className="absolute top-10 right-10 p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition shadow-sm"><X size={24}/></button>
                
                <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-4">Course Specification</label>
                      {isEditing ? (
                        <textarea 
                          value={editForm?.description || ""}
                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          className="w-full px-8 py-8 rounded-[32px] bg-gray-50 border-none text-[16px] font-medium text-gray-600 leading-relaxed min-h-[250px] outline-none ring-2 ring-transparent focus:ring-brand/5 transition shadow-inner"
                          placeholder="Describe the course learning outcomes..."
                        />
                      ) : (
                        <div className="relative">
                          <p className="text-[18px] font-medium text-gray-500 leading-relaxed max-w-prose">
                            {course?.description || course?.subject?.description || "No description available."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-10 grid grid-cols-2 gap-6">
                      {isEditing ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Academic Year</label>
                            <div className="relative group">
                              <select 
                                value={editForm?.year || 1}
                                onChange={(e) => setEditForm({...editForm, year: parseInt(e.target.value)})}
                                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-[13px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-brand/5 transition appearance-none"
                              >
                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}{y===1 ? "st" : y===2 ? "nd" : y===3 ? "rd" : "th"} Year</option>)}
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={16} />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Active Semester</label>
                            <div className="relative group">
                              <select 
                                value={editForm?.term || "Semester 1"}
                                onChange={(e) => setEditForm({...editForm, term: e.target.value})}
                                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-[13px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-brand/5 transition appearance-none"
                              >
                                {["Semester 1", "Semester 2"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={16} />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 text-gray-400 bg-gray-50 px-6 py-4 rounded-2xl">
                            <div className="w-2 h-2 rounded-full bg-brand"></div>
                            <span className="text-[12px] font-black uppercase tracking-wider">{course?.year}{course?.year===1 ? "st" : course?.year===2 ? "nd" : course?.year===3 ? "rd" : "th"} Year Registry</span>
                          </div>
                          <div className="flex items-center gap-4 text-gray-400 bg-gray-50 px-6 py-4 rounded-2xl">
                            <div className="w-2 h-2 rounded-full bg-brand"></div>
                            <span className="text-[12px] font-black uppercase tracking-wider">{course?.term}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="mt-8 flex items-center gap-4 p-6 rounded-3xl bg-brand/5 border border-brand/10 group/view">
                        <div className="flex-1">
                          <h4 className="text-[14px] font-black text-brand uppercase tracking-wider mb-1">Perspective View</h4>
                          <p className="text-[11px] font-medium text-gray-400 leading-tight">Preview this course as it appears to different platform roles.</p>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setShowTeacherPreview(true)}
                            className="px-6 py-3.5 rounded-2xl bg-white border border-brand/10 text-[11px] font-black uppercase text-brand tracking-wider hover:bg-brand hover:text-white hover:border-transparent transition shadow-sm"
                          >
                            Teacher View
                          </button>
                          <button 
                            onClick={() => setShowStudentPreview(true)}
                            className="px-6 py-3.5 rounded-2xl bg-white border border-brand/10 text-[11px] font-black uppercase text-brand tracking-wider hover:bg-brand hover:text-white hover:border-transparent transition shadow-sm"
                          >
                            Student View
                          </button>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="mt-4 flex items-center justify-between gap-4 p-6 rounded-3xl bg-brand text-white shadow-xl shadow-brand/15 group/cohort">
                        <div className="flex-1">
                          <h4 className="text-[14px] font-black uppercase tracking-wider mb-1">Cohorts & Schedules</h4>
                          <p className="text-[11px] font-medium text-purple-100/70 leading-tight">Manage student cohorts (Groups A/B) and weekly timetabled sessions.</p>
                        </div>
                        <button 
                          onClick={() => setShowCohortManager(true)}
                          className="px-6 py-3.5 rounded-2xl bg-white text-brand text-[11px] font-black uppercase tracking-wider hover:bg-purple-50 transition shadow-sm flex items-center gap-1.5"
                        >
                          Manage Cohorts
                        </button>
                      </div>
                    )}
                </div>

                <div className="flex gap-4 mt-10 font-sans">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={onSave}
                        className="flex-[2] py-4 rounded-3xl bg-brand text-white font-black uppercase tracking-wider text-[13px] shadow-2xl shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition"
                      >
                        Confirm Registry Update
                      </button>
                      <button 
                        onClick={() => onDelete(editForm.id)}
                        className="flex-1 py-4 rounded-3xl bg-red-50 text-red-500 font-black uppercase tracking-wider text-[13px] hover:bg-red-500 hover:text-white transition border-none"
                      >
                        Delete Registry
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="flex-[2] py-4 rounded-3xl bg-brand text-white font-black uppercase tracking-wider text-[13px] shadow-2xl shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition"
                      >
                        Modify system data
                      </button>
                      <button className="flex-1 py-4 rounded-3xl border-2 border-gray-100 text-gray-400 font-black uppercase tracking-wider text-[13px] hover:bg-gray-50 transition">
                        Archive
                      </button>
                    </>
                  )}
                </div>
            </div>
          </div>
      </motion.div>
      </div>

      <AnimatePresence>
        {showTeacherPreview && (
          <TeacherPerspectiveModal 
            course={course} 
            onClose={() => setShowTeacherPreview(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStudentPreview && (
          <StudentPerspectiveModal 
            course={course} 
            onClose={() => setShowStudentPreview(false)} 
          />
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showCohortManager && (
          <CohortManagerModal 
            course={course}
            onClose={() => setShowCohortManager(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
