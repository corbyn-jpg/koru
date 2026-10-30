import { MdAccessTime } from "react-icons/md";
import { motion } from "framer-motion";

export default function TimelineEventCompressed({
  title = "Contact Session",
  lecturer = "Laudette Sass",
  duration = "15min",
  location = "Online",
  timeRange = "12:30 - 12:45",
  isPast = false,
  onManageAttendance = null,
  onCheckIn = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex-1 pb-5 transition-opacity duration-300 ${isPast ? "opacity-45" : "opacity-100"}`}
    >
      <p className={`text-sm font-medium mb-2.5 ml-0.5 ${isPast ? "text-gray-300" : "text-gray-500"}`}>{timeRange}</p>

      <div className={`border rounded-2xl px-5 py-4 transition-shadow duration-200 ${isPast ? "bg-gray-20 border-gray-100 hover:shadow-md" : "bg-white border-gray-200 hover:shadow-md"}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-black/30 leading-tight font-['Gabarito']">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Lecturer – {lecturer}</p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPast ? "text-gray-400 bg-gray-100" : "text-brand bg-brand/8"}`}>
              {location}
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${isPast ? "bg-gray-100" : "bg-blue-100"}`}>
              <MdAccessTime className={`w-3.5 h-3.5 ${isPast ? "text-gray-400" : "text-blue-800"}`} />
              <span className={`text-xs font-semibold ${isPast ? "text-gray-400" : "text-blue-800"}`}>{duration}</span>
            </div>
          </div>
        </div>

        {/* Attendance actions */}
        {!isPast && (onManageAttendance || onCheckIn) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {onManageAttendance && (
              <button
                onClick={e => { e.stopPropagation(); onManageAttendance(); }}
                className="w-full py-2 rounded-xl bg-brand/8 text-brand text-[10px] font-black uppercase tracking-wider hover:bg-brand hover:text-white transition-colors"
              >
                Manage Attendance
              </button>
            )}
            {onCheckIn && (
              <button
                onClick={e => { e.stopPropagation(); onCheckIn(); }}
                className="w-full py-2 rounded-xl bg-brand/8 text-brand text-[10px] font-black uppercase tracking-wider hover:bg-brand hover:text-white transition-colors"
              >
                Check In Now
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
