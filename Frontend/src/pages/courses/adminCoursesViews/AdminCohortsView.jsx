import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Users, ChevronDown, ChevronRight, Shuffle, AlertTriangle,
  Plus, BookOpen, Clock, User, MapPin, Calendar, Check, Pencil,
  AlertCircle, ExternalLink,
} from "lucide-react";
import {
  getCourseCohorts,
  createClassGroup,
  deleteClassGroup,
  getCohortDetails,
  assignStudents,
  getCourseStudents,
} from "../../../services/classGroupService";
import { enrollmentService, userService } from "../../../services/adminService";
import { classService } from "../../../services/classService";
import { getCourseEvents } from "../../../services/eventService";
import { getCourseLecturers } from "../../../services/courseService";
import { staggerContainer, slideUp } from "../teacherCoursesComponents/constants";
import { useNavigate } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const QUICK_NAMES = ["Lecture", "Workshop", "Practical", "Tutorial"];
const DEFAULT_SLOT_FORM = { name: "", durationHours: "2", teacherId: "", room: "", dayOfWeek: "", startTime: "", endTime: "" };
const DEFAULT_MANUAL_FORM = { name: "", teacherId: "", room: "", dayOfWeek: "", startTime: "", endTime: "" };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// ── Quick-name chips + text input combo ────────────────────────────────────────
function NameField({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_NAMES.map(n => (
          <button
            key={n} type="button" onClick={() => onChange(n)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              value === n
                ? "bg-[#3C0078] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-[#3C0078]/10 hover:text-[#3C0078]"
            }`}
          >{n}</button>
        ))}
      </div>
      <input
        type="text" placeholder="Custom name…" value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20 placeholder:text-gray-400"
      />
    </div>
  );
}

// ── Class slot card ────────────────────────────────────────────────────────────
function ClassSlotCard({ slot, onEdit, onDelete, deleting }) {
  const isScheduled = !!slot.startTime;

  return (
    <div className={`rounded-2xl border px-3 py-2.5 group transition-colors ${
      isScheduled
        ? "bg-green-50/70 border-green-200/70"
        : "bg-gray-50/80 border-gray-200/80"
    }`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Top row: name + status badge */}
          <div className="flex flex-wrap items-center gap-1.5">
            {slot.name && (
              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                isScheduled ? "text-green-700 bg-green-100" : "text-gray-600 bg-gray-200"
              }`}>
                {slot.name}
              </span>
            )}
            {/* Scheduled / Unscheduled status badge */}
            {isScheduled ? (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md text-green-600 bg-green-50 border border-green-200 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green-500 inline-block animate-pulse" />
                Active
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md text-amber-600 bg-amber-50 border border-amber-200">
                Unscheduled
              </span>
            )}
          </div>

          {/* Detail row */}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {isScheduled ? (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-700">
                <Calendar size={9} />
                {slot.dayOfWeek} · {formatTime(slot.startTime)}
                {slot.endTime && ` – ${formatTime(slot.endTime)}`}
              </span>
            ) : (
              <>
                {slot.durationHours && (
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Clock size={9} />{slot.durationHours}h
                  </span>
                )}
                {slot.dayOfWeek && (
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Calendar size={9} />Preferred: {slot.dayOfWeek}
                  </span>
                )}
              </>
            )}
            {slot.teacherName && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <User size={9} />{slot.teacherName}
              </span>
            )}
            {slot.room && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <MapPin size={9} />{slot.room}
              </span>
            )}
          </div>
        </div>

        {/* Actions — only render when handlers are provided */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
            {onEdit && (
              <button onClick={onEdit} className="p-1 rounded-lg text-gray-400 hover:text-[#3C0078] hover:bg-[#3C0078]/5 transition-colors">
                <Pencil size={11} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} disabled={deleting} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                {deleting ? <span className="text-[9px]">…</span> : <Trash2 size={11} />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function detectSlotConflict(form, otherSlots, editingId) {
  if (!form.dayOfWeek || !form.startTime || !form.endTime) return null;
  const s = toMinutes(form.startTime);
  const e = toMinutes(form.endTime);
  if (s >= e) return "End time must be after start time.";
  for (const slot of otherSlots) {
    if (slot.id === editingId || slot.dayOfWeek !== form.dayOfWeek || !slot.startTime) continue;
    const os = toMinutes(slot.startTime.slice(0, 5));
    const oe = toMinutes((slot.endTime || slot.startTime).slice(0, 5));
    if (s < oe && os < e) {
      const conflictsWith = (form.teacherId && slot.teacherId === form.teacherId)
        ? "same lecturer"
        : (form.room && slot.room === form.room)
        ? "same room"
        : slot.classGroupId === form.classGroupId
        ? "same group"
        : null;
      if (conflictsWith) return `Conflicts with "${slot.name || "another class"}" (${conflictsWith}).`;
    }
  }
  return null;
}

// ── Slot form ──────────────────────────────────────────────────────────────────
function SlotForm({ form, setForm, teachers, onSave, onCancel, saving, otherSlots = [], editingId = null }) {
  const isScheduled = !!(form.startTime || form.endTime);
  const conflict = isScheduled ? detectSlotConflict(form, otherSlots, editingId) : null;

  return (
    <div className="bg-white border border-[#3C0078]/15 rounded-2xl p-3 space-y-2.5">
      <NameField value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
      <div className="grid grid-cols-2 gap-2">
        {!isScheduled && (
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Hours</label>
            <input type="number" min={0.5} max={8} step={0.5} value={form.durationHours}
              onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
            />
          </div>
        )}
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Room</label>
          <input type="text" placeholder="e.g. Room 201" value={form.room}
            onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Lecturer</label>
          <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
          >
            <option value="">No preference</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
          </select>
        </div>
        <div className={isScheduled ? "col-span-2" : ""}>
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Day</label>
          <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
          >
            <option value="">Any day</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {isScheduled && (
          <>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Start Time</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">End Time</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
              />
            </div>
          </>
        )}
      </div>
      {conflict && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={11} className="text-red-500 shrink-0 mt-0.5" />
          <span className="text-[10px] font-semibold text-red-700">{conflict}</span>
        </div>
      )}
      <div className="flex gap-2 pt-0.5">
        <button onClick={onSave} disabled={saving || !!conflict}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#3C0078] text-white text-[11px] font-bold hover:bg-[#2a0055] transition-colors disabled:opacity-50"
        >
          <Check size={11} />{saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Classes section (right panel) ─────────────────────────────────────────────
function ClassesSection({ groupId, courseId, teachers, refreshKey, onChanged }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_SLOT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = groupId
        ? await classService.getByGroup(groupId)
        : await classService.getUnassignedByCourse(courseId);
      setSlots(data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, courseId]);

  useEffect(() => { loadSlots(); }, [loadSlots, refreshKey]);

  const openAdd = () => { setEditingId(null); setForm(DEFAULT_SLOT_FORM); setAddOpen(true); };
  const openEdit = (slot) => {
    setAddOpen(false);
    setForm({
      name: slot.name || "",
      durationHours: slot.durationHours?.toString() || "2",
      teacherId: slot.teacherId || "",
      room: slot.room || "",
      dayOfWeek: slot.dayOfWeek || "",
      startTime: slot.startTime ? slot.startTime.slice(0, 5) : "",
      endTime: slot.endTime ? slot.endTime.slice(0, 5) : "",
    });
    setEditingId(slot.id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name || null,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        teacherId: form.teacherId || null,
        room: form.room || null,
        dayOfWeek: form.dayOfWeek || null,
        courseId,
        classGroupId: groupId || null,
        isGenerated: false,
      };
      if (editingId) {
        await classService.update(editingId, {
          ...payload, id: editingId,
          startTime: form.startTime ? form.startTime + ":00" : null,
          endTime: form.endTime ? form.endTime + ":00" : null,
        });
      } else {
        await classService.create(payload);
      }
      await loadSlots();
      onChanged?.();
      setAddOpen(false);
      setEditingId(null);
      setForm(DEFAULT_SLOT_FORM);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await classService.delete(id);
      setSlots(prev => prev.filter(s => s.id !== id));
      onChanged?.();
      if (editingId === id) setEditingId(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Classes · {slots.length} per week
        </span>
        {!addOpen && !editingId && (
          <button onClick={openAdd}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#3C0078] bg-[#3C0078]/5 hover:bg-[#3C0078]/10 transition-colors"
          >
            <Plus size={10} /> Add slot
          </button>
        )}
      </div>

      {addOpen && (
        <SlotForm form={form} setForm={setForm} teachers={teachers}
          onSave={handleSave}
          onCancel={() => { setAddOpen(false); setForm(DEFAULT_SLOT_FORM); }}
          saving={saving}
        />
      )}

      {loading ? (
        <div className="text-[11px] text-gray-400 animate-pulse">Loading…</div>
      ) : slots.length === 0 && !addOpen ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
          <BookOpen size={13} className="text-gray-300 shrink-0" />
          <span className="text-xs text-gray-400">No class slots yet.</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {slots.map(slot => (
            editingId === slot.id ? (
              <SlotForm key={slot.id} form={form} setForm={setForm} teachers={teachers}
                onSave={handleSave}
                onCancel={() => { setEditingId(null); setForm(DEFAULT_SLOT_FORM); }}
                saving={saving}
                otherSlots={slots}
                editingId={editingId}
              />
            ) : (
              <ClassSlotCard key={slot.id} slot={slot}
                onEdit={() => openEdit(slot)}
                onDelete={() => handleDelete(slot.id)}
                deleting={deletingId === slot.id}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Class Manually ─────────────────────────────────────────────────────────
function AddClassManuallySection({ groupId, courseId, teachers, onAdded }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_MANUAL_FORM);
  const [saving, setSaving] = useState(false);

  const canSave = form.dayOfWeek && form.startTime && form.endTime;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await classService.create({
        name: form.name || null,
        teacherId: form.teacherId || null,
        room: form.room || null,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime + ":00",
        endTime: form.endTime + ":00",
        courseId,
        classGroupId: groupId || null,
        isGenerated: false,
      });
      onAdded();
      setOpen(false);
      setForm(DEFAULT_MANUAL_FORM);
    } catch (err) {
      alert("Failed to add class: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-gray-50/60 transition-colors"
      >
        <Plus size={13} className="text-gray-400 shrink-0" />
        <span className="text-xs font-bold text-gray-500">Add Class Manually</span>
        <span className="ml-auto">
          {open
            ? <ChevronDown size={13} className="text-gray-400" />
            : <ChevronRight size={13} className="text-gray-400" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3">
              {/* Conflict warning */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-amber-700 leading-snug flex-1">
                  Manually scheduled classes may cause teacher conflicts.{" "}
                  <button
                    onClick={() => navigate("/calendar")}
                    className="underline hover:text-amber-800 inline-flex items-center gap-0.5"
                  >
                    Review on the calendar page <ExternalLink size={9} />
                  </button>
                </p>
              </div>

              <NameField value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Lecturer</label>
                  <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
                  >
                    <option value="">Select lecturer</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Room</label>
                  <input type="text" placeholder="e.g. Room 201" value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Day <span className="text-red-400">*</span></label>
                  <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
                  >
                    <option value="">Select day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Start <span className="text-red-400">*</span></label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">End <span className="text-red-400">*</span></label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#3C0078]/20"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving || !canSave}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#3C0078] text-white text-xs font-bold hover:bg-[#2a0055] transition-colors disabled:opacity-50"
                >
                  <Check size={12} />{saving ? "Adding…" : "Add Class"}
                </button>
                <button
                  onClick={() => { setOpen(false); setForm(DEFAULT_MANUAL_FORM); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AdminCohortsView ───────────────────────────────────────────────────────────
export function AdminCohortsView({ courseId, course }) {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState([]);
  const [maxPerGroup, setMaxPerGroup] = useState(15);
  const [assigning, setAssigning] = useState(false);
  const [assignStep, setAssignStep] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [cohortDetails, setCohortDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classRefreshKeys, setClassRefreshKeys] = useState({});
  const [unassignedClasses, setUnassignedClasses] = useState([]);
  const [unassignedEvents, setUnassignedEvents] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [unassignedExpanded, setUnassignedExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [courseLecturers, setCourseLecturers] = useState([]);

  // All lecturers associated with this course; fall back to all teachers if not loaded yet
  const courseTeachers = useMemo(() => {
    if (courseLecturers.length > 0) return courseLecturers;
    if (!course?.teacherId || teachers.length === 0) return teachers;
    const filtered = teachers.filter(t => t.id === course.teacherId);
    return filtered.length > 0 ? filtered : teachers;
  }, [courseLecturers, course, teachers]);

  const bumpRefresh = (groupId) =>
    setClassRefreshKeys(prev => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }));

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [cohortsData, allEnrollments, teacherList, courseStudentsData, unassignedClassesData, courseEventsData, lecturersData] = await Promise.all([
        getCourseCohorts(courseId).catch(() => []),
        enrollmentService.getAllEnrollments().catch(() => []),
        userService.getTeachers().catch(() => []),
        getCourseStudents(courseId).catch(() => []),
        classService.getUnassignedByCourse(courseId).catch(() => []),
        getCourseEvents(courseId).catch(() => []),
        getCourseLecturers(courseId).catch(() => []),
      ]);
      setCohorts(cohortsData || []);
      setTeachers(teacherList || []);
      setCourseLecturers(lecturersData || []);
      setUnassignedClasses(unassignedClassesData || []);
      const seen = new Set();
      setUnassignedEvents((courseEventsData || []).filter(e => {
        const t = e.eventType?.toLowerCase();
        if (t !== "class" && t !== "lecture" && t !== "workshop" && t !== "practical") return false;
        const start = e.startTime ? new Date(e.startTime) : null;
        const key = `${(e.title || "").toLowerCase()}|${start ? start.getDay() : "?"}|${start ? `${start.getHours()}:${start.getMinutes()}` : "?"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
      setUnassignedStudents((courseStudentsData || []).filter(s => !s.classGroupId));
      const ids = (allEnrollments || [])
        .filter(e => e.courseId === courseId || e.course?.id === courseId)
        .map(e => e.studentId || e.student?.id)
        .filter(Boolean);
      setEnrolledCount(ids.length);
      setEnrolledStudentIds(ids);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const groupCount = maxPerGroup > 0 ? Math.ceil(enrolledCount / maxPerGroup) : 0;

  const handleAutoAssign = async () => {
    if (enrolledCount === 0 || groupCount === 0) return;
    if (cohorts.length > 0 && !window.confirm(
      `This will delete ${cohorts.length} existing group${cohorts.length !== 1 ? "s" : ""} and reassign all ${enrolledCount} students into ${groupCount} new group${groupCount !== 1 ? "s" : ""}. Continue?`
    )) return;
    setAssigning(true);
    setAssignStep("Clearing existing groups…");
    try {
      for (const cohort of cohorts) await deleteClassGroup(cohort.id).catch(() => {});
      const shuffled = shuffle(enrolledStudentIds);
      for (let i = 0; i < groupCount; i++) {
        setAssignStep(`Creating Group ${i + 1} of ${groupCount}…`);
        const group = await createClassGroup({ name: `Group ${i + 1}`, courseId });
        const slice = shuffled.slice(i * maxPerGroup, (i + 1) * maxPerGroup);
        if (slice.length > 0) await assignStudents(group.id, slice);
      }
      setAssignStep("Done!");
      await load();
      setCohortDetails({});
    } catch (err) {
      alert("Auto-assign failed: " + err.message);
    } finally {
      setAssigning(false);
      setAssignStep("");
    }
  };

  const handleExpand = async (cohortId) => {
    if (expandedId === cohortId) { setExpandedId(null); return; }
    setExpandedId(cohortId);
    if (!cohortDetails[cohortId]) {
      setLoadingDetails(prev => ({ ...prev, [cohortId]: true }));
      try {
        const details = await getCohortDetails(cohortId);
        setCohortDetails(prev => ({ ...prev, [cohortId]: details }));
      } catch {
        setCohortDetails(prev => ({ ...prev, [cohortId]: { students: [] } }));
      } finally {
        setLoadingDetails(prev => ({ ...prev, [cohortId]: false }));
      }
    }
  };

  const handleDelete = async (cohortId, name) => {
    if (!window.confirm(`Delete group "${name}"? Students will be unassigned.`)) return;
    setDeletingId(cohortId);
    try {
      await deleteClassGroup(cohortId);
      setCohorts(prev => prev.filter(c => c.id !== cohortId));
      if (expandedId === cohortId) setExpandedId(null);
    } catch (err) {
      alert("Failed to delete group: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleImportFromEvents = async () => {
    setImporting(true);
    try {
      await classService.importFromEvents(courseId);
      await load();
      bumpRefresh("unassigned");
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
      <motion.header variants={slideUp} className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Groups & Classes</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {cohorts.length} {cohorts.length === 1 ? "group" : "groups"} · {enrolledCount} enrolled students
        </p>
      </motion.header>

      {/* Auto-assign config */}
      <motion.div variants={slideUp} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Auto-Assign Configuration</h3>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Max students per group</label>
            <input
              type="number" min={1} max={200} value={maxPerGroup}
              onChange={e => setMaxPerGroup(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#3C0078]/10"
            />
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {enrolledCount > 0 && groupCount > 0 ? (
              <p className="text-sm font-semibold text-gray-600">
                <span className="text-[#3C0078] font-black">{enrolledCount}</span> →{" "}
                <span className="text-[#3C0078] font-black">{groupCount}</span> group{groupCount !== 1 ? "s" : ""} of ~<span className="text-[#3C0078] font-black">{maxPerGroup}</span>
              </p>
            ) : enrolledCount === 0 ? (
              <p className="text-sm text-gray-400">No enrolled students yet</p>
            ) : null}
            <button
              onClick={handleAutoAssign} disabled={assigning || enrolledCount === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#3C0078] text-white text-sm font-bold shadow-lg shadow-[#3C0078]/20 hover:bg-[#2a0055] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Shuffle size={15} />
              {assigning ? assignStep || "Working…" : cohorts.length > 0 ? "Reassign Groups" : "Auto-Assign Groups"}
            </button>
          </div>
        </div>
        {cohorts.length > 0 && !assigning && (
          <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-700">Reassigning will delete all current groups and redistribute students from scratch.</p>
          </div>
        )}
      </motion.div>

      {/* Convert calendar events → class slots banner */}
      {unassignedEvents.length > 0 && (
        <motion.div variants={slideUp} className="flex items-center justify-between gap-4 px-5 py-4 bg-blue-50 border border-blue-100 rounded-3xl mb-6">
          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-0.5">
                {unassignedEvents.length} Calendar Event{unassignedEvents.length !== 1 ? "s" : ""} Found
              </p>
              <p className="text-[11px] text-blue-600">
                These class-type events can be converted to editable class slots. The calendar events will be removed.
              </p>
            </div>
          </div>
          <button
            onClick={handleImportFromEvents}
            disabled={importing}
            className="shrink-0 px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {importing ? "Converting…" : "Convert to Slots"}
          </button>
        </motion.div>
      )}

      {/* Groups list */}
      <motion.div variants={slideUp} className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm h-20" />)}
          </div>
        ) : cohorts.length === 0 && unassignedClasses.length === 0 && unassignedEvents.length === 0 && unassignedStudents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-8 py-14 text-center">
            <div className="w-14 h-14 rounded-3xl bg-[#3C0078]/5 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-[#3C0078]/40" />
            </div>
            <p className="text-gray-500 font-semibold mb-1">No groups yet</p>
            <p className="text-xs text-gray-400">Set a max per group above and click Auto-Assign to get started.</p>
          </div>
        ) : (
          <>
          {/* ── Unassigned pseudo-group ── */}
          {(unassignedClasses.length > 0 || unassignedEvents.length > 0 || unassignedStudents.length > 0) && (
            <div className="bg-white/70 rounded-3xl border border-dashed border-gray-300 shadow-sm overflow-hidden">
              <div className="flex items-center px-6 py-4 gap-4">
                <button
                  onClick={() => setUnassignedExpanded(v => !v)}
                  className="w-9 h-9 rounded-2xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all shrink-0"
                >
                  {unassignedExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-500">Unassigned</p>
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                      Pre-cohort
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {unassignedClasses.length + unassignedEvents.length} schedule slot{(unassignedClasses.length + unassignedEvents.length) !== 1 ? "s" : ""} · {unassignedStudents.length} student{unassignedStudents.length !== 1 ? "s" : ""} not in a group
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {unassignedExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="flex min-h-0 divide-x divide-gray-100">
                      {/* Left: unassigned students */}
                      <div className="flex-1 min-w-0 px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Students · {unassignedStudents.length}
                          </span>
                        </div>
                        {unassignedStudents.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">All students are in groups.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {unassignedStudents.map(s => (
                              <div key={s.studentId} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/80">
                                <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-black text-[10px] shrink-0">
                                  {s.studentName?.split(" ")[0]?.[0]}{s.studentName?.split(" ")[1]?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-700 truncate">{s.studentName}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Classes section + Add Manually (interactive, same as cohort groups) */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="px-5 py-4">
                          <ClassesSection
                            groupId={null}
                            courseId={courseId}
                            teachers={courseTeachers}
                            refreshKey={classRefreshKeys["unassigned"] || 0}
                            onChanged={load}
                          />
                        </div>
                        {unassignedEvents.length > 0 && (
                          <div className="px-5 pb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Calendar Events · {unassignedEvents.length}
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                              {unassignedEvents.map(evt => {
                                const start = evt.startTime ? new Date(evt.startTime) : null;
                                const end = evt.endTime ? new Date(evt.endTime) : null;
                                const dayName = start ? start.toLocaleDateString("en-US", { weekday: "long" }) : null;
                                const fmt = (d) => d ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` : null;
                                return (
                                  <div key={evt.id} className="flex items-start gap-2 px-3 py-2 rounded-2xl bg-blue-50/60 border border-blue-100">
                                    <Calendar size={12} className="text-blue-400 shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider truncate">{evt.title}</span>
                                        <span className="text-[8px] font-bold text-blue-400 bg-blue-100 px-1 py-0.5 rounded shrink-0">Calendar Event</span>
                                      </div>
                                      {(dayName || fmt(start)) && (
                                        <p className="text-[10px] text-blue-500 mt-0.5">
                                          {dayName}{fmt(start) ? ` · ${fmt(start)}${fmt(end) ? `–${fmt(end)}` : ""}` : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <AddClassManuallySection
                          groupId={null}
                          courseId={courseId}
                          teachers={courseTeachers}
                          onAdded={() => { bumpRefresh("unassigned"); load(); }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Real cohort groups ── */}
          {cohorts.map(cohort => {
            const isExpanded = expandedId === cohort.id;
            const details = cohortDetails[cohort.id];
            const isLoadingDetails = loadingDetails[cohort.id];
            const studentCount = details?.students?.length ?? cohort.studentCount ?? "—";

            return (
              <div key={cohort.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="flex items-center px-6 py-4 gap-4 group">
                  <button
                    onClick={() => handleExpand(cohort.id)}
                    className="w-9 h-9 rounded-2xl bg-gray-50 hover:bg-[#3C0078]/5 flex items-center justify-center text-gray-400 hover:text-[#3C0078] transition-all shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="w-10 h-10 rounded-2xl bg-[#3C0078]/5 border border-[#3C0078]/10 flex items-center justify-center shrink-0">
                    <Users size={18} className="text-[#3C0078]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{cohort.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {typeof studentCount === "number" ? `${studentCount} student${studentCount !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(cohort.id, cohort.name)}
                    disabled={deletingId === cohort.id}
                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  >
                    {deletingId === cohort.id ? <span className="text-xs">…</span> : <Trash2 size={15} />}
                  </button>
                </div>

                {/* Expanded panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-50"
                    >
                      {isLoadingDetails ? (
                        <div className="px-8 py-6 text-center text-gray-400 text-sm animate-pulse">Loading…</div>
                      ) : (
                        <>
                          {/* ── Students LEFT · Classes + Add Manually RIGHT ── */}
                          <div className="flex min-h-0 divide-x divide-gray-100">
                            {/* Left: Students */}
                            <div className="flex-1 min-w-0 px-5 py-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  Students · {details?.students?.length ?? 0}
                                </span>
                              </div>
                              {!details?.students?.length ? (
                                <p className="text-xs text-gray-400 italic">No students in this group.</p>
                              ) : (
                                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                  {details.students.map(s => (
                                    <div key={s.id || s.studentId} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/80">
                                      <div className="w-7 h-7 rounded-full bg-[#3C0078]/5 border border-[#3C0078]/10 flex items-center justify-center text-[#3C0078] font-black text-[10px] shrink-0">
                                        {(s.firstName || s.student?.firstName)?.[0]}
                                        {(s.lastName || s.student?.lastName)?.[0]}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">
                                          {s.firstName || s.student?.firstName} {s.lastName || s.student?.lastName}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate">{s.email || s.student?.email}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right: Classes section + Add Manually */}
                            <div className="flex-1 min-w-0 flex flex-col">
                              <div className="px-5 py-4">
                                <ClassesSection
                                  groupId={cohort.id}
                                  courseId={courseId}
                                  teachers={courseTeachers}
                                  refreshKey={classRefreshKeys[cohort.id] || 0}
                                />
                              </div>
                              <AddClassManuallySection
                                groupId={cohort.id}
                                courseId={courseId}
                                teachers={courseTeachers}
                                onAdded={() => bumpRefresh(cohort.id)}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
