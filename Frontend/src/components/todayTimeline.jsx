import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TimelineNode from "./UI/timelineNode";
import TimelineEventExpanded from "./UI/timelineEventExpanded";
import TimelineEventCompressed from "./UI/timelineEventCompressed";
import AttendanceManageModal from "./AttendanceManageModal";
import CheckInModal from "./CheckInModal";

import { getAllEvents, getTeacherEvents } from "../services/eventService";
import { getStudentAssignments, getTeacherAssignments } from "../services/assignmentService";
import { getAvailableSessionsForStudent } from "../services/checkInService";
import { useAuth } from "../contexts/AuthContext";

const MIN_LOADING_MS = 1500;

function mapBackendEventToTimeline(evt) {
  const startTime   = evt.startTime   ?? evt.StartTime;
  const endTime     = evt.endTime     ?? evt.EndTime;
  const courseId    = evt.courseId    ?? evt.CourseId;
  const title       = evt.title       ?? evt.Title       ?? "";
  const description = evt.description ?? evt.Description ?? "";
  const createdBy   = evt.createdBy   ?? evt.CreatedBy;

  const startDate = new Date(startTime);
  const endDate   = new Date(endTime);
  const durationMinutes = Math.round((endDate - startDate) / 60000);

  let subtitle = description;
  let location = "TBA";
  if (description.includes("|")) {
    const parts = description.split("|");
    subtitle = parts[0];
    location = parts[1] || "TBA";
  }

  return {
    id:         evt.id ?? evt.Id,
    courseId,
    title,
    subtitle,
    lecturer:   createdBy || "Unknown",
    duration:   `${durationMinutes}min`,
    location,
    startHour:  startDate.getHours(),
    startMin:   startDate.getMinutes(),
    endHour:    endDate.getHours(),
    endMin:     endDate.getMinutes(),
    isAssignment: false,
  };
}

function mapAssignmentToTimeline(assignment) {
  const due = new Date(assignment.dueDate);
  const courseCode = assignment.course?.subject?.code || assignment.course?.subject?.name || "Assignment";
  return {
    id:       `assign-${assignment.id}`,
    courseId: assignment.courseId,
    title:    assignment.title,
    subtitle: courseCode,
    lecturer: "Due",
    duration: "Due",
    location: "Online",
    startHour: due.getHours(),
    startMin:  due.getMinutes(),
    endHour:   due.getHours(),
    endMin:    due.getMinutes(),
    isAssignment: true,
  };
}

function fmt(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getNextEventIndex(evts, now) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < evts.length; i++) {
    if (evts[i].endHour * 60 + evts[i].endMin > nowMinutes) return i;
  }
  return -1;
}

function isPastEvent(evt, now) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return evt.endHour * 60 + evt.endMin <= nowMinutes;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function inferSessionType(title = "") {
  if (/practical/i.test(title)) return "Practical";
  if (/tutorial/i.test(title)) return "Tutorial";
  return "Lecture";
}

function SkeletonEvent() {
  return (
    <div className="flex gap-4 mb-3">
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="w-3 h-3 rounded-full bg-gray-100 animate-pulse mt-1" />
        <div className="w-0.5 h-14 bg-gray-100 animate-pulse mt-1" />
      </div>
      <div className="flex-1 rounded-2xl border border-gray-200 p-3 mb-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/3" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function TodayTimeline() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [now, setNow]                     = useState(new Date());
  const [events, setEvents]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [availableSessions, setAvailable] = useState([]);
  const [manageModal, setManageModal]     = useState(null);
  const [checkInModal, setCheckInModal]   = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const [data, assignmentsData] = await Promise.all([
          isTeacher && user?.userId ? getTeacherEvents(user.userId) : getAllEvents(),
          isTeacher && user?.userId
            ? getTeacherAssignments(user.userId)
            : user?.userId
            ? getStudentAssignments(user.userId)
            : Promise.resolve([]),
          new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
        ]);

        const todayStr = new Date().toDateString();
        const todayEvents = data
          .filter(e => new Date(e.startTime).toDateString() === todayStr)
          .map(mapBackendEventToTimeline);
        const todayAssignments = assignmentsData
          .filter(a => new Date(a.dueDate).toDateString() === todayStr)
          .map(mapAssignmentToTimeline);

        const combined = [...todayEvents, ...todayAssignments].sort(
          (a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin)
        );
        if (mounted) setEvents(combined);
      } catch (err) {
        console.error("Failed to load timeline:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [user?.userId, user?.role]);

  useEffect(() => {
    if (!user?.userId || isTeacher) return;
    const poll = () =>
      getAvailableSessionsForStudent(user.userId)
        .then(sessions => setAvailable(sessions ?? []))
        .catch(err => console.warn("Check-in poll failed:", err));
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [user?.userId, isTeacher]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const nextIdx = getNextEventIndex(events, now);

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200/50 shadow-card rounded-3xl p-4">
      <div className="flex items-center justify-between mt-5 mb-1">
        <h2 className="text-2xl font-['Gabarito']">Today</h2>
      </div>
      <p className="text-sm text-gray-400 mb-5 font-medium">{formatDate(now)}</p>
      <div className="h-5" />

      <div className="relative flex flex-col pr-1">
        {loading ? (
          <>{[0, 1, 2].map(i => <SkeletonEvent key={i} />)}</>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10 font-medium">No events scheduled for today.</p>
        ) : (
          events.map((evt, idx) => {
            const isNext  = idx === nextIdx;
            const isPast  = isPastEvent(evt, now);
            const timeRange = evt.isAssignment
              ? `Due at ${fmt(evt.endHour, evt.endMin)}`
              : `${fmt(evt.startHour, evt.startMin)} – ${fmt(evt.endHour, evt.endMin)}`;

            const showManage = isTeacher && !evt.isAssignment && !isPast && !!evt.courseId;
            const openSession = !isTeacher && !evt.isAssignment && !isPast
              ? availableSessions.find(s => s.courseId === evt.courseId)
              : null;

            const manageProps = showManage
              ? { onManageAttendance: () => setManageModal({ courseId: evt.courseId, sessionType: inferSessionType(evt.title), courseName: evt.title }) }
              : {};
            const checkInProps = openSession
              ? { onCheckIn: () => setCheckInModal({ courseName: evt.title }) }
              : {};

            return (
              <div key={evt.id} className="flex items-stretch gap-4">
                <TimelineNode
                  isActive={isNext}
                  isPast={isPast}
                  isFirst={idx === 0}
                  isLast={idx === events.length - 1}
                />
                {isNext ? (
                  <TimelineEventExpanded
                    title={evt.title}
                    subtitle={evt.subtitle}
                    lecturer={evt.lecturer}
                    duration={evt.duration}
                    location={evt.location}
                    timeRange={timeRange}
                    isPast={isPast}
                    {...manageProps}
                    {...checkInProps}
                  />
                ) : (
                  <TimelineEventCompressed
                    title={evt.title}
                    lecturer={evt.lecturer}
                    duration={evt.duration}
                    location={evt.location}
                    timeRange={timeRange}
                    isPast={isPast}
                    {...manageProps}
                    {...checkInProps}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {manageModal && (
          <AttendanceManageModal
            key="manage"
            courseId={manageModal.courseId}
            teacherId={user.userId}
            sessionType={manageModal.sessionType}
            courseName={manageModal.courseName}
            onClose={() => setManageModal(null)}
          />
        )}
        {checkInModal && (
          <CheckInModal
            key="checkin"
            courseName={checkInModal.courseName}
            onClose={() => setCheckInModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
