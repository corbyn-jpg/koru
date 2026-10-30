import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Plus } from "lucide-react";
import { SearchInput } from "./SearchInput";

export function AssignStudentsModal({ allStudents, currentStudentIds, courseTitle, onAssign, onClose }) {
  const [search, setSearch] = useState("");
  const unassigned = allStudents.filter(
    (s) => !currentStudentIds.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-['Gabarito']">Assign Students</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Adding to <span className="font-semibold text-gray-700">{courseTitle}</span></p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search students..." />
        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2">
          {unassigned.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No more students to assign.</p>
          ) : (
            unassigned.map((student) => (
              <button
                key={student.id}
                onClick={() => onAssign(student.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-200 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-400">{student.major}</p>
                </div>
                <Plus className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
