import React, { useState } from "react";
import { motion } from "framer-motion";

export function AddCourseForm({ lecturerName, subjects, onSave, onCancel }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [term, setTerm] = useState("Semester 1");

  const canSave = subjectId && term;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 mb-3">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          autoFocus
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
        >
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
          ))}
        </select>
        <select
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
        >
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
        </select>
        <p className="text-xs text-gray-400">Lecturer: {lecturerName}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          <button onClick={() => canSave && onSave(subjectId, term)} disabled={!canSave} className="px-4 py-1.5 text-xs font-bold text-white bg-brand rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-40">Save</button>
        </div>
      </div>
    </motion.div>
  );
}
