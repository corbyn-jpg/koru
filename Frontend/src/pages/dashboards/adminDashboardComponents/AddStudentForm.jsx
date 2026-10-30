import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function AddStudentForm({ onSave, onCancel }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const canSave = firstName.trim() && lastName.trim() && email.trim() && tempPassword.trim();

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      tempPassword: tempPassword.trim(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black font-['Gabarito']">Add Student</h3>
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">First Name</label>
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              className="text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Last Name</label>
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            placeholder="student@university.ac"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Temporary Password</label>
          <input
            type="text"
            placeholder="Temporary password"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition"
          />
          <p className="text-xs text-gray-400">The student will be enrolled in the selected course and must change this password on first login.</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-[2] px-4 py-3 text-sm font-bold text-white bg-brand rounded-2xl hover:bg-brand-deep transition-colors disabled:opacity-40"
          >
            Add Student
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
