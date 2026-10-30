import React from "react";
import { motion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(String);

function SelectField({ label, value, onChange, children, disabled }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none text-sm border border-gray-200 rounded-xl px-4 py-3 pr-9 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-800"
        >
          {children}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, mono }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition font-medium text-gray-800 ${mono ? "uppercase tracking-wider" : ""}`}
      />
    </div>
  );
}

export default function CreateCourseModal({ show, onClose, form, setForm, teachers, onCreate }) {
  if (!show) return null;

  const canCreate = form.name?.trim() && form.teacherId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black font-['Gabarito']">New Course</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create a course and assign a lecturer</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Course name + code */}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <TextField
            label="Course Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Interactive Development"
          />
          <TextField
            label="Code"
            value={form.code || ""}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="DV300"
            mono
          />
        </div>

        {/* Lecturer */}
        <SelectField
          label="Lecturer"
          value={form.teacherId}
          onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
        >
          <option value="">Select a lecturer…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </SelectField>

        {/* Year + Semester */}
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Year"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </SelectField>

          <SelectField
            label="Semester"
            value={form.term}
            onChange={(e) => setForm({ ...form, term: e.target.value })}
          >
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
          </SelectField>
        </div>

        {/* Capacity */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Capacity</label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition font-medium text-gray-800"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!canCreate}
            className="flex-[2] px-4 py-3 text-sm font-bold text-white bg-brand rounded-2xl hover:bg-brand-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Course
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
