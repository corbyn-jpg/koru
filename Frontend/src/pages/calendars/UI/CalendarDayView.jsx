import React, { useState } from "react";

// ── Constants ─────────────────────────────────────────────────
const START_HOUR  = 7;    // 07:00
const TOTAL_HOURS = 13;   // 07:00 → 20:00
const TRACK_H_PER_HOUR = 58; // px per hour
const CARD_H      = 90;   // fixed card height (px) — overlap guard uses this
const AXIS_X      = 16;   // px from left edge where the vertical line lives

function timeToY(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return Math.max(0, ((h - START_HOUR) * 60 + m) / 60 * TRACK_H_PER_HOUR);
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Icons ────────────────────────────────────────────────────
const MonitorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="12" y2="16" />
  </svg>
);

const TYPE_ICONS = {
  class:    <MonitorIcon />,
  meeting:  <PeopleIcon />,
  task:     <CheckIcon />,
  personal: <PersonIcon />,
};

// ─────────────────────────────────────────────────────────────
/**
 * CalendarDayView
 *
 * Two-column layout:
 *  Left  — vertical timeline with large event cards
 *  Right — To-Do list
 *
 * Props:
 *  - events (array) : Flat EVENTS array (with optional lecturer, location)
 *  - tasks  (array) : Array of { id, title, due, dueTime, course, done }
 *  - weeks  (array) : GRID_WEEKS — used to build the day nav list
 */
export default function CalendarDayView({ events = [], tasks = [], weeks = [] }) {
  // Flatten all dates in the month into a navigable list
  const allDates = weeks.flat(); // [{ date, day }, ...]
  const [dateIdx, setDateIdx] = useState(0);
  // Ticked-off tasks (kept locally for now). Hooks must run before the early return below.
  const [doneTasks, setDoneTasks] = useState([]);
  const toggleTask = (id) =>
    setDoneTasks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selected = allDates[dateIdx];
  if (!selected) return <p className="text-gray-400 text-sm pt-8">No dates available.</p>;

  const { date, day } = selected;
  const jsDate  = new Date(date + "T00:00:00");
  const dayName = DAY_NAMES[jsDate.getDay()].toUpperCase();

  // Filter + sort events for the selected day
  const raw = events
    .filter((e) => e.date === date)
    .map((e) => ({ ...e, _y: timeToY(e.startTime) }))
    .sort((a, b) => a._y - b._y);

  // Overlap guard: push events down so cards never visually collide
  let prevBottom = -Infinity;
  const dayEvents = [];
  for (const evt of raw) {
    const y = Math.max(evt._y, prevBottom + 10);
    prevBottom = y + CARD_H;
    dayEvents.push({ ...evt, y });
  }

  const trackH = Math.max(
    TOTAL_HOURS * TRACK_H_PER_HOUR,
    prevBottom + 20
  );

  return (
    <div>
      {/* ── Day navigation header ──────────────────────────── */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => setDateIdx((i) => Math.max(0, i - 1))}
          disabled={dateIdx === 0}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-base border-none cursor-pointer hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition font-[inherit]"
          aria-label="Previous day"
        >
          ‹
        </button>

        <p className="text-[13px] font-semibold tracking-widest text-gray-500 uppercase leading-none">
          {dayName}&nbsp;
          <span className="text-gray-900 text-xl font-black tracking-normal normal-case">
            {day}
          </span>
        </p>

        <button
          onClick={() => setDateIdx((i) => Math.min(allDates.length - 1, i + 1))}
          disabled={dateIdx === allDates.length - 1}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-base border-none cursor-pointer hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition font-[inherit]"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {/* ── Two-column body ───────────────────────────────── */}
      <div className="grid gap-10" style={{ gridTemplateColumns: "55% 1fr" }}>

        {/* ── LEFT: Vertical timeline ── */}
        <div className="relative" style={{ height: trackH }}>

          {/* Axis line */}
          <div
            className="absolute top-0 bottom-0 bg-gray-200"
            style={{ left: AXIS_X, width: 1 }}
          />

          {dayEvents.length === 0 && (
            <p className="absolute text-sm text-gray-400" style={{ left: AXIS_X + 20, top: 12 }}>
              No events this day.
            </p>
          )}

          {dayEvents.map((evt) => (
            <div
              key={evt.id}
              className="absolute flex items-center"
              style={{ top: evt.y, left: 0, right: 0 }}
            >
              {/* Dot on axis */}
              <div
                className="shrink-0 rounded-full bg-gray-400"
                style={{
                  width: 9,
                  height: 9,
                  marginLeft: AXIS_X - 4,
                  marginRight: 14,
                }}
              />

              {/* Event card */}
              <div
                className="flex-1 flex items-stretch bg-gray-100 rounded-2xl overflow-hidden mr-2"
                style={{ minHeight: CARD_H }}
              >
                {/* Icon box */}
                <div className="flex items-center justify-center px-4 py-3 shrink-0">
                  <div className="w-12 h-12 rounded-xl border-2 border-gray-400 flex items-center justify-center text-gray-500">
                    {TYPE_ICONS[evt.type] ?? <MonitorIcon />}
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 flex flex-col justify-center py-3 pr-2 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                    {evt.title}
                  </p>
                  {evt.lecturer && (
                    <p className="text-gray-500 text-xs mt-1 truncate">{evt.lecturer}</p>
                  )}
                  {evt.location && (
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{evt.location}</p>
                  )}
                </div>

                {/* Time column */}
                <div className="flex flex-col justify-between items-end px-4 py-4 border-l border-gray-200 shrink-0">
                  <span className="text-[11px] text-gray-500 font-medium">{evt.startTime}</span>
                  {evt.endTime && (
                    <span className="text-[11px] text-gray-400">{evt.endTime}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── RIGHT: To-Do panel ── */}
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-['Gabarito'] text-2xl font-bold text-gray-900">
              To - Do
            </h2>
            <button
              aria-label="Add task"
              className="w-7 h-7 rounded-full border-2 border-gray-400 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition bg-transparent cursor-pointer font-[inherit]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Task list */}
          <div className="flex flex-col gap-3">
            {tasks.map((task) => {
              const done = doneTasks.includes(task.id);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3"
                >
                  {/* Clipboard icon */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                    <ClipboardIcon />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm leading-tight ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        DUE {task.due} at {task.dueTime}
                      </span>
                      {task.course && (
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                          {task.course}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label="Toggle task"
                    className={[
                      "w-6 h-6 rounded-lg border-2 shrink-0 transition-all duration-150 cursor-pointer",
                      done
                        ? "bg-gray-700 border-gray-700"
                        : "bg-transparent border-gray-300 hover:border-gray-400",
                    ].join(" ")}
                  />
                </div>
              );
            })}

            {tasks.length === 0 && (
              <p className="text-sm text-gray-400 pl-1">No tasks this month.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
