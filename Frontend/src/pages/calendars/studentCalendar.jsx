import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import CalendarDayBlock from "./UI/CalendarDayBlock";
import CalendarViewSelector from "./UI/CalendarViewSelector";
import CalendarTimelineView from "./UI/CalendarTimelineView";
import CalendarDayView from "./UI/CalendarDayView";
import AddTaskModal from "./UI/AddTaskModal";

import { useCalendar } from "../../contexts/CalendarContext";
import { useAuth } from "../../contexts/AuthContext";
import { classService } from "../../services/classService";
import { getStudentCourses } from "../../services/courseService";

// ─────────────────────────────────────────────────────────────
//  HELPERS — dynamic grid & event generation
// ─────────────────────────────────────────────────────────────
const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_MAP = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };

function expandClassToCalendarEvents(cls, weeksForward = 20, weeksBack = 26) {
  const targetDow = DAY_MAP[cls.dayOfWeek];
  if (targetDow === undefined || !cls.startTime) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pad = n => String(n).padStart(2, "0");
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const [sh, sm] = cls.startTime.split(":");
  const [eh, em] = (cls.endTime || cls.startTime).split(":");
  const eventData = {
    title: [cls.name, cls.courseName].filter(Boolean).join(" · "),
    startTime: `${pad(parseInt(sh))}:${pad(parseInt(sm))}`,
    endTime: `${pad(parseInt(eh))}:${pad(parseInt(em))}`,
    type: cls.isGenerated ? "scheduled" : "class",
    lecturer: cls.teacherName || "",
    location: cls.room || "",
    courseId: cls.courseId,
  };
  const daysBehind = (today.getDay() - targetDow + 7) % 7;
  const events = [];
  for (let w = 0; w < weeksBack; w++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBehind - w * 7);
    events.push({ ...eventData, id: `cls-gen-${cls.id}-${fmtDate(d)}`, date: fmtDate(d) });
  }
  const daysUntil = (targetDow - today.getDay() + 7) % 7 || 7;
  for (let w = 0; w < weeksForward; w++) {
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntil + w * 7);
    events.push({ ...eventData, id: `cls-gen-${cls.id}-${fmtDate(d)}`, date: fmtDate(d) });
  }
  return events;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a Date to YYYY-MM-DD using local timezone (avoids UTC shift from toISOString) */
function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Build the calendar grid for a given year/month.
 * Returns an array of week arrays (each week = 7 day objects).
 * Weeks start on Monday. Days from adjacent months are marked isOutside.
 */
function buildGridWeeks(year, month) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells = [];
  const startDate = new Date(year, month, 1 - startDow);

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    cells.push({
      date: formatLocalDate(d),
      day: d.getDate(),
      isOutside: d.getMonth() !== month,
    });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  while (weeks.length > 0 && weeks[weeks.length - 1].every(c => c.isOutside)) {
    weeks.pop();
  }

  return weeks;
}

// Build a date → events[] lookup map, sorted earliest first within each day
function buildEventMap(events) {
  const map = events.reduce((m, evt) => {
    if (!m[evt.date]) m[evt.date] = [];
    m[evt.date].push(evt);
    return m;
  }, {});
  Object.values(map).forEach(arr =>
    arr.sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    })
  );
  return map;
}

// Framer Motion variants
const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const viewVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

// ─────────────────────────────────────────────────────────────
export default function StudentCalendar({ onDeleteClassEvent } = {}) {
  const { user } = useAuth();
  // Pre-loaded data — already fetching before the user opened this page
  const { events, setEvents, tasks, loading } = useCalendar();

  // Inject recurring class slot events for each course the student is enrolled in.
  // When embedded inside AdminCalendar (signalled by the onDeleteClassEvent prop),
  // skip — the admin calendar injects all classes itself, and an admin has no
  // enrollments, so running this would wipe the admin's injected class events.
  useEffect(() => {
    if (onDeleteClassEvent) return;
    if (!user?.userId) return;
    getStudentCourses(user.userId)
      .then(enrollments => {
        const courseIds = new Set((enrollments || []).map(e => e.course?.id).filter(Boolean));
        return classService.getAll().then(allClasses => {
          const myClasses = (allClasses || []).filter(c => courseIds.has(c.courseId));
          const classEvents = myClasses.flatMap(c => expandClassToCalendarEvents(c));
          setEvents(prev => {
            const withoutOld = prev.filter(e => !e.id?.startsWith("cls-gen-"));
            return [...withoutOld, ...classEvents];
          });
        });
      })
      .catch(err => console.error("Failed to load class slots for student calendar:", err));
  }, [user?.userId]);

  const [activeView, setActiveView] = useState("month");
  // Track current month as { year, month } (month is 0-indexed)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Add Task modal
  const [taskModal, setTaskModal] = useState({ open: false, editEvent: null, defaultDate: "" });

  /** Add a new or save an edited locally-created task */
  function handleAddTask(event) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [...prev, event];
    });
  }

  /** Delete a user task by id */
  function handleDeleteTask(eventId) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  /** Move an event to a new day when dropped */
  function handleEventDrop(targetDate, eventId) {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, date: targetDate } : evt))
    );
  }

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // Compute grid for the active month
  const gridWeeks = useMemo(
    () => buildGridWeeks(currentMonth.year, currentMonth.month),
    [currentMonth.year, currentMonth.month]
  );

  const eventMap = useMemo(() => buildEventMap(events), [events]);
  const todayStr = formatLocalDate(new Date());
  const monthLabel = `${MONTH_NAMES[currentMonth.month]} ${currentMonth.year}`;

  return (
    <>

      <motion.div
        className="w-full pt-5 pb-10"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="relative flex items-center justify-between mb-5">

          {/* Month title + arrows — left */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-['Gabarito'] !text-3xl text-gray-900 select-none text-center">
              {monthLabel}
            </h1>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* View selector — truly centred */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <CalendarViewSelector activeView={activeView} onChange={setActiveView} />
          </div>

          {/* Add Task — right */}
          <button
            id="cal-add-task-btn"
            aria-label="Add Task"
            onClick={() => setTaskModal({ open: true, editEvent: null, defaultDate: "" })}
            className="flex items-center gap-2 bg-white rounded-full px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm border-none cursor-pointer transition duration-150 hover:shadow-lg hover:-translate-y-px font-[inherit]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Task
          </button>
        </div>

        {/* ── View area ───────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* MONTH VIEW */}
          {activeView === "month" && (
            <motion.div
              key={`month-${currentMonth.year}-${currentMonth.month}`}
              className="w-full border border-gray-200 rounded-2xl overflow-hidden"
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {WEEK_DAYS.map((label, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-2.5">
                    {label}
                  </div>
                ))}
              </div>

              {/* Week rows */}
              <div className="flex flex-col">
                {gridWeeks.map((week, wIdx) => (
                  <div key={wIdx} className={`grid grid-cols-7 ${wIdx > 0 ? "border-t border-gray-200" : ""}`}>
                    {week.map(({ date, day, isOutside }) => (
                      <CalendarDayBlock
                        key={date}
                        day={day}
                        date={date}
                        isToday={date === todayStr}
                        isOutside={!!isOutside}
                        events={eventMap[date] ?? []}
                        loading={loading}
                        onDrop={handleEventDrop}
                        onEditEvent={(evt) => setTaskModal({ open: true, editEvent: evt, defaultDate: evt.date })}
                        onDeleteEvent={handleDeleteTask}
                        onDeleteClassEvent={onDeleteClassEvent}
                        onDayClick={(d) => setTaskModal({ open: true, editEvent: null, defaultDate: d })}
                        tooltipPosition={wIdx === 0 ? "down" : "up"}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TIMELINE VIEW */}
          {activeView === "timeline" && (
            <motion.div
              key={`timeline-${currentMonth.year}-${currentMonth.month}`}
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CalendarTimelineView
                events={events}
                weeks={gridWeeks}
                loading={loading}
                onDayClick={(d) => setTaskModal({ open: true, editEvent: null, defaultDate: d })}
              />
            </motion.div>
          )}

          {/* DAY VIEW — commented out, felt redundant
          {activeView === "day" && (
            <motion.div
              key={`day-${currentMonth.year}-${currentMonth.month}`}
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CalendarDayView
                events={events}
                tasks={tasks}
                weeks={gridWeeks}
              />
            </motion.div>
          )}
          */}

        </AnimatePresence>
      </motion.div>

      {/* Add Task modal — rendered outside the scrollable area */}
      <AddTaskModal
        open={taskModal.open}
        editEvent={taskModal.editEvent}
        defaultDate={taskModal.defaultDate}
        onClose={() => setTaskModal({ open: false, editEvent: null, defaultDate: "" })}
        onAdd={handleAddTask}
      />
    </>
  );
}
