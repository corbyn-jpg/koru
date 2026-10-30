import { MdPersonOutline, MdAccessTime } from "react-icons/md";
import { motion } from "framer-motion";

export default function TimelineEventExpanded({
  title = "DV300 - Theory",
  subtitle = "Project Proposal Pitch",
  lecturer = "Tsungai Katsuro",
  duration = "60min",
  location = "Online",
  timeRange = "11:00 - 12:00",
  isPast = false,
  onManageAttendance = null,
  onCheckIn = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex-1 pb-5 transition-opacity duration-300 ${isPast ? "opacity-45" : "opacity-100"}`}
    >
      <p className={`text-sm font-semibold mb-2.5 ml-0.5 tracking-wide ${isPast ? "text-gray-400 line-through" : "text-gray-600"}`}>
        {timeRange}
      </p>

      <div className={`rounded-2xl overflow-hidden transition-shadow duration-200 ${isPast ? "bg-gray-50" : "bg-purple-100 hover:shadow-md"}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-black leading-tight font-['Gabarito']">{title}</h3>
              <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${isPast ? "text-white-400 bg-gray-100" : "text-brand bg-brand/8"}`}>
              {location}
            </span>
          </div>

          <div className="h-3" />

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isPast ? "bg-gray-100" : "bg-brand/10"}`}>
                <MdPersonOutline className={`w-5 h-5 ${isPast ? "text-gray-400" : "text-brand"}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-black leading-tight uppercase tracking-wider font-medium">Lecturer</span>
                <span className="text-sm font-semibold text-black leading-tight">{lecturer}</span>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isPast ? "bg-gray-100" : "bg-white"}`}>
              <MdAccessTime className={`w-4 h-4 ${isPast ? "text-gray-400" : "text-black"}`} />
              <span className={`text-sm font-semibold ${isPast ? "text-gray-400" : "text-black"}`}>{duration}</span>
            </div>
          </div>

          {/* Attendance actions */}
          {!isPast && (onManageAttendance || onCheckIn) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              {onManageAttendance && (
                <button
                  onClick={e => { e.stopPropagation(); onManageAttendance(); }}
                  className="w-full py-2.5 rounded-xl bg-brand text-white text-xs font-black uppercase tracking-wider hover:bg-brand-deep transition-colors"
                >
                  Manage Attendance
                </button>
              )}
              {onCheckIn && (
                <button
                  onClick={e => { e.stopPropagation(); onCheckIn(); }}
                  className="w-full py-2.5 rounded-xl bg-brand text-white text-xs font-black uppercase tracking-wider hover:bg-brand-deep transition-colors"
                >
                  Check In Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
