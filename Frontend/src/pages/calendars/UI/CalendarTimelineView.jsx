import React, { useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────
const HOUR_H      = 52;          // px per hour
const GUTTER_W    = 56;          // px — time-label column
const AXIS_X      = 0;           // align with the left border of the day cells
const PILL_H      = 28;

function timeToHourNum(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const ICONS = {
  class: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  meeting: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  task: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  personal: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

// Larger versions for the tooltip header
const ICONS_LG = {
  class: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  meeting: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  task: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  personal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

// Meta icons used inside the tooltip
const PersonIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PinIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Skeleton helpers ──────────────────────────────────────────
// Plausible class start times used to position skeleton pills on the track
const SKELETON_SLOTS = [9, 11, 13, 15, 17];

/**
 * Returns a small array of simulated event y-positions for a given date,
 * so the skeleton looks like real data. Seeded by date so it's stable.
 */
function skeletonPositions(date, timeToY) {
  const seed = date.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const dow = new Date(date + "T12:00:00").getDay(); // 0=Sun … 6=Sat
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend && seed % 3 === 0) return []; // ~1/3 of weekend days empty
  const count = isWeekend ? 1 : ((seed % 3) === 0 ? 3 : 2);
  const picks = [];
  for (let i = 0; i < SKELETON_SLOTS.length && picks.length < count; i++) {
    const idx = (seed + i * 7) % SKELETON_SLOTS.length;
    if (!picks.includes(SKELETON_SLOTS[idx])) picks.push(SKELETON_SLOTS[idx]);
  }
  return picks.map(h => timeToY(`${h}:00`));
}

export default function CalendarTimelineView({ events = [], weeks = [], loading = false, onDayClick }) {
  const [weekIdx, setWeekIdx] = useState(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const idx = weeks.findIndex(w => w.some(day => day.date === today));
    return idx >= 0 ? idx : 0;
  });

  const week = weeks[weekIdx] ?? [];

  const weekLabel = () => {
    if (week.length !== 7) return "";
    const a = new Date(week[0].date + "T12:00:00");
    const b = new Date(week[6].date + "T12:00:00");
    const ma = a.toLocaleDateString("en-US", { month: "short" });
    const mb = b.toLocaleDateString("en-US", { month: "short" });
    return ma === mb
      ? `${ma} ${a.getDate()} – ${b.getDate()}`
      : `${ma} ${a.getDate()} – ${mb} ${b.getDate()}`;
  };

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();

  const weekDates = week.map(d => d.date);
  const weekEvents = events.filter(e => weekDates.includes(e.date));

  // Dynamic start and end hours
  const startHour = 5; // Start at 5 AM
  let maxHour = 21; // Default to 9 PM
  weekEvents.forEach(evt => {
    if (evt.startTime) {
      const startH = timeToHourNum(evt.startTime);
      if (startH > maxHour) maxHour = startH;
    }
    if (evt.endTime) {
      const endH = timeToHourNum(evt.endTime);
      if (endH > maxHour) maxHour = endH;
    }
  });

  const endHour = Math.max(21, Math.ceil(maxHour));
  const totalHours = endHour - startHour;
  const trackHeight = totalHours * HOUR_H;

  function timeToY(t) {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return Math.max(0, ((h - startHour) + m / 60) * HOUR_H);
  }

  const hourSlots = Array.from({ length: totalHours + 1 }, (_, i) => {
    const h = startHour + i;
    const label = h < 12 ? `${h} AM` : h === 12 ? "12 PM" : h === 24 ? "12 AM" : `${h - 12} PM`;
    return { label, y: i * HOUR_H };
  });

  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between px-1 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekIdx(i => Math.max(0, i-1))} disabled={weekIdx === 0}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-base border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
          <span className="text-sm font-semibold text-gray-600 min-w-[110px] text-center select-none">{weekLabel()}</span>
          <button onClick={() => setWeekIdx(i => Math.min(weeks.length-1, i+1))} disabled={weekIdx === weeks.length-1}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-base border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
        </div>
        <span className="text-[11px] text-gray-400 pr-1">Week {weekIdx+1} / {weeks.length}</span>
      </div>

      {/*
        TABLE LAYOUT — the only primitive that guarantees header and body
        cells share identical column widths. tableLayout:"fixed" + colgroup
        locks every column so nothing can drift.
      */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          {/* Gutter column */}
          <col style={{ width: GUTTER_W }} />
          {/* 7 equal day columns */}
          {week.map((_, i) => <col key={i} />)}
        </colgroup>

        {/* ── Header row ───────────────────────────────────────────── */}
        <thead>
          <tr>
            {/* Empty corner above gutter */}
            <th style={{ borderBottom: "1px solid #e5e7eb", padding: 0, height: "60px", boxSizing: "border-box" }} />

            {week.map(({ date, day }, i) => {
              const isToday = date === todayStr;
              return (
                <th key={date} style={{
                  borderBottom: "1px solid #e5e7eb",
                  borderLeft:   "1px solid #e5e7eb",
                  padding:      "10px 0",
                  textAlign:    "center",
                  fontWeight:   "normal",
                  height:       "60px",
                  verticalAlign: "bottom",
                  boxSizing:    "border-box",
                }}>
                  <span style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#9ca3af" }}>
                    {DAY_LETTERS[i]}
                  </span>
                  <span style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:26, height:26, borderRadius:"50%", marginTop:2,
                    fontSize:12, fontWeight:700,
                    background: isToday ? "#8b5cf6" : "transparent",
                    color:      isToday ? "#fff"     : "#374151",
                  }}>
                    {day}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Track row ────────────────────────────────────────────── */}
        <tbody>
          <tr>
            {/* Gutter — hour labels */}
            <td style={{ verticalAlign:"top", padding:0 }}>
              <div style={{ position:"relative", height:trackHeight }}>
                {hourSlots.map(({ label, y }) => (
                  <span key={label} style={{
                    position:"absolute", right:8, top:y,
                    transform:"translateY(-50%)",
                    fontSize:10, fontWeight:500, color:"#9ca3af",
                    whiteSpace:"nowrap", lineHeight:1,
                    userSelect:"none",
                  }}>
                    {label}
                  </span>
                ))}
              </div>
            </td>

            {/* Day track cells */}
            {week.map(({ date }) => {
              const raw = events
                .filter(e => e.date === date)
                .map(e => ({ ...e, y: timeToY(e.startTime) }))
                .sort((a, b) => a.y - b.y);

              for (let i = 0; i < raw.length; i++) {
                if (i === 0) {
                  if (raw[i].y < PILL_H / 2) raw[i].y = PILL_H / 2;
                } else {
                  if (raw[i].y < raw[i-1].y + PILL_H) raw[i].y = raw[i-1].y + PILL_H;
                }
              }

              // Skeleton positions for this day column
              const skelPositions = loading ? skeletonPositions(date, timeToY) : [];
              // Seed for varying skeleton pill widths
              const skelSeed = date.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

              return (
                <td key={date} style={{ verticalAlign:"top", padding:0, borderLeft:"1px solid #e5e7eb", cursor:"pointer" }}
                  onClick={() => onDayClick?.(date)}>
                  <div style={{ position:"relative", height:trackHeight }}>

                    {/* Hour gridlines */}
                    {hourSlots.map(({ label, y }) => (
                      y > 0 && <div key={label} style={{
                        position:"absolute", top:y, left:0, right:0,
                        borderTop:"1px solid #f3f4f6", pointerEvents:"none",
                      }} />
                    ))}

                    {/* Vertical axis */}
                    <div style={{
                      position:"absolute", top:0, bottom:0,
                      left:AXIS_X, width:1, background:"#d1d5db",
                      pointerEvents:"none",
                    }} />

                    {/* ── Skeleton pills (loading) ── */}
                    {loading && skelPositions.map((y, i) => (
                      <div key={i}
                        style={{ position:"absolute", top:y, left:0, right:4, display:"flex", alignItems:"center", transform:"translateY(-50%)", pointerEvents:"none" }}>
                        {/* Dot placeholder */}
                        <div style={{
                          flexShrink:0, width:8, height:8, borderRadius:"50%",
                          background:"#e5e7eb",
                          marginLeft:AXIS_X - 4, marginRight:6,
                        }} />
                        {/* Pill placeholder */}
                        <div
                          className="animate-pulse rounded-full bg-gray-200"
                          style={{ height: PILL_H, flex:1, width: `${45 + ((skelSeed * (i + 2) * 13) % 40)}%`, maxWidth:"calc(100% - 18px)" }}
                        />
                      </div>
                    ))}

                    {/* ── Real event pills (loaded) ── */}
                    {!loading && raw.map(evt => {
                      const hasTooltipDetails = evt.lecturer || evt.location || evt.startTime;
                      return (
                        <div key={evt.id}
                          style={{ position:"absolute", top:evt.y, left:0, right:4, display:"flex", alignItems:"center", transform:"translateY(-50%)" }}
                          onClick={e => e.stopPropagation()}>

                          {/* Dot */}
                          <div style={{
                            flexShrink:0, width:8, height:8, borderRadius:"50%",
                            background:"#8b5cf6",
                            marginLeft:AXIS_X - 4, marginRight:6,
                          }} />

                          {/* Pill */}
                          <div className="group/pill relative min-w-0 flex-1">
                            {/* Hover Tooltip — styled exactly like month view */}
                            {hasTooltipDetails && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-purple-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 pointer-events-none opacity-0 group-hover/pill:opacity-100 translate-y-1.5 group-hover/pill:translate-y-0 transition duration-200 ease-out">
                                {/* Title row with icon */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <div className="w-8 h-8 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 text-gray-500">
                                    {ICONS_LG[evt.type] ?? ICONS_LG.class}
                                  </div>
                                  <span className="font-semibold text-[13px] text-white leading-snug">{evt.title}</span>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-white mb-2" />

                                {/* Meta rows */}
                                <div className="flex flex-col gap-1.5">
                                  {evt.startTime && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-white">
                                      <span className="text-white shrink-0"><ClockIcon /></span>
                                      <span>
                                        {evt.startTime}
                                        {evt.endTime ? ` – ${evt.endTime}` : ""}
                                      </span>
                                    </div>
                                  )}
                                  {evt.lecturer && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-white">
                                      <span className="text-white shrink-0"><PersonIcon /></span>
                                      <span className="truncate">{evt.lecturer}</span>
                                    </div>
                                  )}
                                  {evt.location && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-white">
                                      <span className="shrink-0"><PinIcon /></span>
                                      <span className="truncate">{evt.location}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Caret (pointing down) */}
                                <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2.5 h-2.5 bg-purple-800 rotate-45 shadow-[1px_1px_0px_rgba(0,0,0,0.04)]" />
                              </div>
                            )}

                            {/* Event pill — styled exactly like month view */}
                            <div className={[
                              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition duration-150 shadow-xs hover:-translate-y-px hover:shadow-md border border-gray-200",
                              evt.type === "task"
                                ? "bg-amber-50 text-gray-800 hover:bg-amber-100"
                                : "bg-white text-black hover:bg-purple-100",
                              "cursor-pointer"
                            ].join(" ")}>
                              {/* Type icon */}
                              <span className={["shrink-0 mt-px", evt.type === "task" ? "text-amber-600" : "text-purple-700"].join(" ")}>
                                {ICONS[evt.type] ?? ICONS.class}
                              </span>

                              {/* Title */}
                              <span className="flex-1 truncate">{evt.title}</span>

                              {/* Time */}
                              {(evt.startTime || evt.endTime) && (
                                <span className={["shrink-0 text-[10px] text-right leading-tight whitespace-nowrap", evt.type === "task" ? "text-amber-500" : "text-gray-400"].join(" ")}>
                                  {evt.startTime && <span className="block">{evt.startTime}</span>}
                                  {evt.endTime && <span className="block">{evt.endTime}</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom cap */}
                    <div style={{
                      position:"absolute", left:AXIS_X - 5, bottom:14,
                      width:10, height:10, borderRadius:"50%",
                      border:"2px solid #ddd6fe", background:"#fff",
                      pointerEvents:"none",
                    }} />
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
