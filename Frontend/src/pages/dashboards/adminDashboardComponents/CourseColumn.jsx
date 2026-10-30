import React from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import { ColumnCard } from "./ColumnCard";
import { SearchInput } from "./SearchInput";

export function CourseColumn({
  courseSearch,
  setCourseSearch,
  filteredCourses,
  selectedCourseId,
  handleSelectCourse,
  lecturers,
  onAddCourse,
  isAddingCourse,
  warningCourseDetails,
}) {
  return (
    <div className="flex flex-col bg-white/70 border border-gray-100 rounded-3xl p-4 h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-2xl font-bold font-['Gabarito']">Courses</h2>
        <button
          onClick={onAddCourse}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
            isAddingCourse
              ? "border-brand bg-brand/10 text-brand"
              : "border-gray-200 hover:bg-gray-100 text-gray-600"
          }`}
          aria-label="Add course"
        >
          {isAddingCourse ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <SearchInput value={courseSearch} onChange={setCourseSearch} />

      <div className="mt-4 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredCourses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No courses found for this filter.</p>
        ) : (
          filteredCourses.map((course) => {
            const isSelected = course.id === selectedCourseId;
            const warningMessage = warningCourseDetails?.get(course.id);
            const hasWarning = !!warningMessage;
            return (
              <ColumnCard
                key={course.id}
                isSelected={isSelected}
                onClick={() => handleSelectCourse(course.id)}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-800"}`}>
                    {course.title}
                  </p>
                  <p className={`text-xs truncate ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                    {lecturers.find((l) => l.id === course.lecturerId)?.name || "Unassigned"}
                  </p>
                </div>
                {hasWarning && (
                  <div className="relative group/tooltip shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center cursor-help transition ${
                      isSelected
                        ? "bg-yellow-400 text-brand"
                        : "bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100"
                    }`}>
                      <AlertTriangle size={12} className="stroke-[2.5]" />
                    </div>
                    
                    {/* Tooltip Content */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/tooltip:block z-50 bg-gray-900 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl whitespace-nowrap pointer-events-none transition">
                      {warningMessage}
                      {/* Arrow */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
                    </div>
                  </div>
                )}
              </ColumnCard>
            );
          })
        )}
      </div>
    </div>
  );
}
