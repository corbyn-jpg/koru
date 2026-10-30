import React from "react";
import { Plus, User, X, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { SearchInput } from "./SearchInput";

function StudentCard({ student, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 bg-white/80 border border-gray-200 hover:border-gray-200 transition-colors duration-150 group"
    >
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{student.name}</p>
        <p className="text-xs text-gray-400 truncate">{student.email || student.major || ""}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(student)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-brand/10 hover:text-brand flex items-center justify-center text-gray-400 transition-colors"
            title="Edit student"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(student)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors"
            title="Remove student"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function StudentColumn({
  showAddStudent,
  isAddingStudent,
  setIsAddingStudent,
  studentSearch,
  setStudentSearch,
  selectedCourseId,
  filteredStudents,
  cohorts = [],
  cohortStudentMap = {},
  onEditStudent,
  onDeleteStudent,
}) {
  const hasCohorts = cohorts.length > 0;

  const cohortGroups = React.useMemo(() => {
    if (!hasCohorts) return null;
    const groups = cohorts.map((c) => ({
      cohort: c,
      students: filteredStudents.filter((s) => cohortStudentMap[s.id] === c.id),
    }));
    const unassigned = filteredStudents.filter((s) => !cohortStudentMap[s.id]);
    return { groups, unassigned };
  }, [hasCohorts, cohorts, filteredStudents, cohortStudentMap]);

  return (
    <div className="flex flex-col bg-white/70 border border-gray-200 rounded-3xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold font-['Gabarito']">Students</h2>
        {showAddStudent && (
          <button
            onClick={() => setIsAddingStudent(prev => !prev)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
              isAddingStudent
                ? "border-brand bg-brand/10 text-brand"
                : "border-gray-200 hover:bg-gray-100 text-gray-600"
            }`}
            aria-label="Add student to course"
          >
            {isAddingStudent ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>
      <SearchInput value={studentSearch} onChange={setStudentSearch} />

      <div className="mt-4 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {!selectedCourseId ? (
          <p className="text-sm text-gray-400 text-center py-8">Select a course to view students.</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No students enrolled.</p>
        ) : hasCohorts ? (
          <>
            {cohortGroups.groups.map(({ cohort, students }) => (
              <div key={cohort.id}>
                <div className="flex items-center gap-2 px-1 py-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-brand">
                    {cohort.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold ml-auto">
                    {students.length} student{students.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {students.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 pb-2 italic">No students assigned</p>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="mb-1.5">
                      <StudentCard student={student} onEdit={onEditStudent} onDelete={onDeleteStudent} />
                    </div>
                  ))
                )}
              </div>
            ))}

            {cohortGroups.unassigned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-1 py-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    Unassigned
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold ml-auto">
                    {cohortGroups.unassigned.length}
                  </span>
                </div>
                {cohortGroups.unassigned.map((student) => (
                  <div key={student.id} className="mb-1.5">
                    <StudentCard student={student} onEdit={onEditStudent} onDelete={onDeleteStudent} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} onEdit={onEditStudent} onDelete={onDeleteStudent} />
          ))
        )}
      </div>
    </div>
  );
}
