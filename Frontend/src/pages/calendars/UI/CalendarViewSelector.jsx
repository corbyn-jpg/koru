import React from "react";
import { motion } from "framer-motion";

// ── Icons ────────────────────────────────────────────────────
const MonthIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="10" x2="9" y2="20" />
    <line x1="15" y1="10" x2="15" y2="20" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
    <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="14" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const DayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="12" y1="10" x2="12" y2="22" />
  </svg>
);

const VIEWS = [
  { id: "month", label: "Month", Icon: MonthIcon },
  { id: "timeline", label: "Timeline", Icon: TimelineIcon },
  // { id: "day", label: "Day", Icon: DayIcon },
];

/**
 * CalendarViewSelector
 *
 * A pill-style segmented control for switching calendar views.
 *
 * Props:
 *  - activeView (string) : "month" | "timeline" | "day"
 *  - onChange   (fn)     : Called with the new view id.
 */
export default function CalendarViewSelector({ activeView, onChange }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 bg-white/80 rounded-full shadow-sm p-1"
      role="tablist"
      aria-label="Calendar view"
    >
      {VIEWS.map(({ id, label, Icon }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            id={`cal-view-${id}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={[
              "relative flex items-center gap-1.5 rounded-full px-4 py-3 text-[13px] cursor-pointer border-none transition-colors duration-150 font-[inherit]",
              isActive ? "text-white bg-purple-500 font-semibold" : "text-gray-400 font-medium hover:text-gray-700",
            ].join(" ")}
          >
            {/* Sliding white pill */}
            {isActive && (
              <motion.span
                className="absolute inset-0 rounded-full bg-white shadow-sm z-[-1]"
                layoutId="cal-view-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="flex items-center shrink-0"><Icon /></span>
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
