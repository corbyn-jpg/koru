import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MdEditNote } from "react-icons/md";

export default function AssignmentItem({
  title = "Assignment",
  dueDate = "Mar 2 at 20:00",
  courseCode = "UX300",
  completed = false,
  uiState = "",
  onToggle,
  assignmentId,
  courseId,
}) {
    const navigate = useNavigate();
    // Determine color based on uiState
    const getUiStateColor = (state) => {
        if (state === "Late") return "bg-red-50 text-red-600";
        if (state === "Due Soon") return "bg-orange-50 text-orange-600";
        if (state === "Closed") return "bg-gray-100 text-gray-500";
        if (state === "Submitted" || completed) return "bg-green-50 text-green-600";
        return "bg-blue-50 text-blue-600";
    }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`w-full border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition duration-300 cursor-pointer
        ${completed ? "bg-gray-50 border-gray-100 opacity-50" : "bg-white border-gray-200 hover:shadow-md"}`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
          ${completed ? "bg-gray-100" : "bg-brand/8"}`}
      >
        <MdEditNote
          className={`w-5 h-5 ${completed ? "text-gray-400" : "text-brand"}`}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-base font-semibold leading-tight font-['Gabarito'] ${completed ? "text-gray-400 line-through" : "text-black"
            }`}
        >
          {title}
        </h4>
        <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
          <span><span className="font-bold text-gray-500">DUE</span> {dueDate}</span>
          <span className="font-bold text-black">{courseCode}</span>
          {uiState && !completed && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getUiStateColor(uiState)}`}>{uiState}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      {completed ? (
        <div
          className="w-7 h-7 rounded-lg border-2 border-brand bg-brand flex items-center justify-center shrink-0"
          aria-label="Completed"
        >
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        </div>
      ) : (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (courseId && assignmentId) {
                    navigate(`/courses/${courseId}/assignments/${assignmentId}`);
                }
            }}
            className="px-4 py-2 bg-brand rounded-xl text-[10px] font-bold uppercase tracking-wider text-white hover:bg-gray-800 transition shadow-sm shrink-0"
        >
            {uiState === 'Closed' ? 'View' : 'Submit'}
        </button>
      )}
    </motion.div>
  );
}
