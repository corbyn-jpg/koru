import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ListTodo } from "lucide-react";

export function AddTodoModal({ lecturer, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = title.trim() && dueDate;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), dueDate, courseCode: courseCode.trim() || "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
              <ListTodo size={18} className="text-brand" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 font-['Gabarito']">Add To Do</h3>
              <p className="text-xs text-gray-400 font-semibold">{lecturer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Task Title</label>
            <input
              type="text"
              placeholder="e.g. Grade submissions for Week 5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">Course Code <span className="normal-case font-medium text-gray-300">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. IXD300"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-5 py-2 text-xs font-bold text-white bg-brand rounded-xl hover:bg-brand-deep transition-colors disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add To Do"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
