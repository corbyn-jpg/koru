import { notify, confirmAction } from "../../../components/UI/feedback";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Plus, Users, Clock, Trash2, Calendar, 
  MapPin, Check, ChevronRight, UserPlus, Info
} from "lucide-react";
import { 
  getCourseCohorts, 
  getCourseStudents, 
  createClassGroup, 
  deleteClassGroup, 
  assignStudents, 
  getCohortDetails 
} from "../../../services/classGroupService";

export default function CohortManagerModal({ course, onClose }) {
  const [cohorts, setCohorts] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [cohortSchedules, setCohortSchedules] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [newCohortName, setNewCohortName] = useState("");
  
  // Schedule Form State
  const [schedDay, setSchedDay] = useState("Monday");
  const [schedStart, setSchedStart] = useState("09:00");
  const [schedEnd, setSchedEnd] = useState("11:00");
  const [schedRoom, setSchedRoom] = useState("");
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  useEffect(() => {
    if (course?.id) {
      loadData();
    }
  }, [course]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedCohorts = await getCourseCohorts(course.id);
      const fetchedStudents = await getCourseStudents(course.id);
      setCohorts(fetchedCohorts);
      setStudents(fetchedStudents);
      
      // Select first cohort if available
      if (fetchedCohorts.length > 0) {
        handleSelectCohort(fetchedCohorts[0].id);
      } else {
        setSelectedCohort(null);
        setCohortSchedules([]);
      }
    } catch (err) {
      console.error("Failed to load cohort data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCohort = async (cohortId) => {
    try {
      const details = await getCohortDetails(cohortId);
      setSelectedCohort(details);
      setCohortSchedules(details.schedules || []);
    } catch (err) {
      console.error("Failed to get cohort details:", err);
    }
  };

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    try {
      await createClassGroup({
        name: newCohortName.trim(),
        courseId: course.id
      });
      setNewCohortName("");
      await loadData();
    } catch (err) {
      notify("Failed to create cohort: " + err.message);
    }
  };

  const handleDeleteCohort = async (cohortId) => {
    if (!await confirmAction("Delete this cohort? Its timetabled sessions are removed too.")) return;
    try {
      await deleteClassGroup(cohortId);
      await loadData();
    } catch (err) {
      notify("Failed to delete cohort: " + err.message);
    }
  };

  const handleAssignStudentCohort = async (studentId, targetCohortId) => {
    try {
      // Find all students currently in target cohort
      const currentTargetCohortStudents = students
        .filter(s => s.classGroupId === targetCohortId)
        .map(s => s.studentId);
      
      // If student is moving into target cohort, add them
      let newTargetList = [...currentTargetCohortStudents];
      if (targetCohortId && !newTargetList.includes(studentId)) {
        newTargetList.push(studentId);
      }

      // If student was in another cohort previously, we must also remove them from that cohort's backend list
      const previousCohortId = students.find(s => s.studentId === studentId)?.classGroupId;
      
      // Call update for previous cohort if any
      if (previousCohortId && previousCohortId !== targetCohortId) {
        const prevCohortStudents = students
          .filter(s => s.classGroupId === previousCohortId && s.studentId !== studentId)
          .map(s => s.studentId);
        await assignStudents(previousCohortId, prevCohortStudents);
      }

      // Call update for target cohort if target is a real cohort (not "Unassigned")
      if (targetCohortId) {
        await assignStudents(targetCohortId, newTargetList);
      }

      // Reload
      await loadData();
      if (selectedCohort && (selectedCohort.id === targetCohortId || selectedCohort.id === previousCohortId)) {
        await handleSelectCohort(selectedCohort.id);
      }
    } catch (err) {
      notify("Failed to assign student: " + err.message);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!selectedCohort) return;
    setIsAddingSchedule(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";
      
      const payload = {
        classGroupId: selectedCohort.id,
        courseId: course.id,
        room: schedRoom.trim() || "Virtual / Main Hall",
        dayOfWeek: schedDay,
        startTime: `${schedStart}:00`,
        endTime: `${schedEnd}:00`,
        isGenerated: false
      };

      const res = await fetch(`${API_BASE}/Class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to schedule slot");
      }

      setSchedRoom("");
      await handleSelectCohort(selectedCohort.id);
    } catch (err) {
      notify("Failed to add schedule: " + err.message);
    } finally {
      setIsAddingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (classId) => {
    if (!await confirmAction("Remove this timetabled session?", { confirmLabel: "Remove" })) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";
      const res = await fetch(`${API_BASE}/Class/${classId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete slot");
      await handleSelectCohort(selectedCohort.id);
    } catch (err) {
      notify("Failed to delete scheduled session: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[40px] w-[90vw] max-w-[1500px] h-[90vh] shadow-3xl overflow-hidden flex flex-col relative"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-4 bg-brand rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand opacity-70">
                {course?.subject?.code} Cohorts & Timetable
              </span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              Class Cohorts & <span className="text-brand">Schedules</span>
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-0 animate-pulse">
            {/* Left panel skeleton */}
            <div className="lg:w-3/5 border-r border-gray-100 p-8 space-y-6 overflow-y-auto">
              <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                <div className="h-3 rounded-full bg-gray-200 w-32" />
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-2xl bg-gray-100" />)}
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                <div className="h-3 rounded-full bg-gray-200 w-40" />
                {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100" />)}
              </div>
            </div>
            {/* Right panel skeleton */}
            <div className="lg:flex-1 p-8 space-y-4">
              <div className="h-3 rounded-full bg-gray-200 w-28 mb-2" />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                  <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 rounded-full bg-gray-200" style={{ width: `${50 + i * 8}%` }} />
                    <div className="h-3 rounded-full bg-gray-100 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Panel: Cohort Select and Timetabling */}
            <div className="lg:w-3/5 border-r border-gray-100 flex flex-col h-full bg-gray-50/20 overflow-y-auto p-8 space-y-8">
              {/* Cohorts Picker */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Users size={14} /> Active Cohorts ({cohorts.length})
                  </h3>
                  <form onSubmit={handleCreateCohort} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Group C"
                      value={newCohortName}
                      onChange={e => setNewCohortName(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-brand/30"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-brand text-white text-[11px] font-black uppercase tracking-wider hover:bg-brand/90 transition flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {cohorts.map((cohort) => {
                    const isSelected = selectedCohort?.id === cohort.id;
                    return (
                      <div 
                        key={cohort.id}
                        onClick={() => handleSelectCohort(cohort.id)}
                        className={`p-4 rounded-2xl cursor-pointer border transition flex items-center justify-between group ${
                          isSelected 
                            ? "bg-brand/5 border-brand text-brand" 
                            : "bg-white border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex-1">
                          <h4 className="text-[13px] font-black">{cohort.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                            {cohort.studentCount || 0} Students
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCohort(cohort.id);
                          }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {cohorts.length === 0 && (
                    <div className="col-span-full py-8 text-center text-gray-400 text-[12px] font-bold italic">
                      No cohorts defined. Create one above to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Schedules Editor */}
              {selectedCohort ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Scheduled Slots */}
                  <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-4">
                      <Calendar size={14} /> Timetable for {selectedCohort.name}
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
                      {cohortSchedules.map((slot) => (
                        <div 
                          key={slot.id} 
                          className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-gray-200 transition"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex flex-col items-center justify-center font-black text-[10px] text-brand shadow-sm">
                              {slot.dayOfWeek?.slice(0, 3)}
                            </div>
                            <div>
                              <div className="text-[12px] font-black text-gray-800 flex items-center gap-1.5">
                                <Clock size={12} className="text-gray-400" />
                                {slot.startTime?.slice(0, 5)} - {slot.endTime?.slice(0, 5)}
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                <MapPin size={10} />
                                {slot.room || "Unassigned Room"}
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleDeleteSchedule(slot.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition border-none"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {cohortSchedules.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400 space-y-2">
                          <Clock size={28} className="opacity-50" />
                          <p className="text-[12px] font-bold">No sessions scheduled for this cohort</p>
                          <p className="text-[10px] max-w-xs leading-relaxed">
                            Students in this group will not see any live class schedules until you add one.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Class Form */}
                  <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-4">
                      <Plus size={14} /> Schedule Session
                    </h3>
                    <form onSubmit={handleAddSchedule} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Day of Week</label>
                        <select 
                          value={schedDay}
                          onChange={e => setSchedDay(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 rounded-xl border-none outline-none text-[12px] font-bold"
                        >
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Start Time</label>
                          <input 
                            type="time"
                            value={schedStart}
                            onChange={e => setSchedStart(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 rounded-xl border-none outline-none text-[12px] font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">End Time</label>
                          <input 
                            type="time"
                            value={schedEnd}
                            onChange={e => setSchedEnd(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 rounded-xl border-none outline-none text-[12px] font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Room Assignment</label>
                        <input 
                          type="text"
                          placeholder="e.g. Lab 208, Main Aud"
                          value={schedRoom}
                          onChange={e => setSchedRoom(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none text-[12px] font-bold"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isAddingSchedule}
                        className="w-full py-3 rounded-xl bg-brand text-white text-[11px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 shadow-md shadow-brand/10"
                      >
                        {isAddingSchedule ? "Saving Slot..." : "Add to Timetable"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
                  <Users size={32} className="text-gray-300" />
                  <p className="text-[13px] font-black text-gray-400 uppercase tracking-wider">No Cohort Selected</p>
                  <p className="text-[11px] text-gray-400 max-w-sm">
                    Select a cohort from the list above to schedule slots and manage its timetable.
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel: Cohort Roster & Routing */}
            <div className="lg:w-2/5 flex flex-col h-full overflow-hidden bg-white">
              {/* Filter / Summary */}
              <div className="p-8 border-b border-gray-100 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand flex items-center gap-2">
                  <UserPlus size={14} /> Course Enrollment Roster ({students.length})
                </h3>
                <p className="text-[11px] text-gray-400 leading-normal">
                  All students actively registered in this course are listed below. Map them to a cohort group to route their schedules and assignment deadlines.
                </p>
              </div>

              {/* Student Cards List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-2">
                {students.map((student) => (
                  <div 
                    key={student.studentId}
                    className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-between hover:border-gray-200 transition"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-[13px] font-black text-gray-800">{student.studentName}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{student.email}</p>
                    </div>

                    <div className="flex items-center">
                      <select 
                        value={student.classGroupId || ""}
                        onChange={(e) => handleAssignStudentCohort(student.studentId, e.target.value || null)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider outline-none border transition ${
                          student.classGroupId 
                            ? "bg-brand/5 border-brand/10 text-brand" 
                            : "bg-gray-100 border-transparent text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        <option value="">Unassigned</option>
                        {cohorts.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {students.length === 0 && (
                  <div className="py-20 text-center text-gray-400 space-y-2">
                    <Info size={28} className="mx-auto opacity-50" />
                    <p className="text-[12px] font-bold">No students registered in this course</p>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed">
                      Before mapping cohorts, make sure students are enrolled in this Course under Registry.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
