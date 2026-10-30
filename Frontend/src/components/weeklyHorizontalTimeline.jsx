import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Check,
  Trash2,
  BookOpen,
  Clock,
  MapPin,
  Video,
  User,
  X,
  ExternalLink,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllEvents } from "../services/eventService";
import { getStudentAssignments } from "../services/assignmentService";
import { useAuth } from "../contexts/AuthContext";
import confetti from "canvas-confetti";

// Helper to find the Monday start of a week for a given date
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is first day (0) and Sunday is last day (6)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

// Format the date range like "May 18 – 24, 2026"
const formatWeekRange = (start) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const startYear = start.getFullYear();

  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }
  return `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
};

export default function WeeklyHorizontalTimeline({ onModalToggle }) {
  const { user } = useAuth();

  // Date State - tracks Monday of the currently selected week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));

  // API and Custom Data states
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom LocalStorage-based events state (unified Todo + Meetings)
  const [customEvents, setCustomEvents] = useState(() => {
    const saved = localStorage.getItem(`learnonline_customevents_${user?.userId || 'guest'}`);
    if (saved) return JSON.parse(saved);

    // Migration: read old customTodos and convert them
    const oldTodos = localStorage.getItem(`learnonline_todos_${user?.userId || 'guest'}`);
    if (oldTodos) {
      try {
        const parsed = JSON.parse(oldTodos);
        return parsed.map(todo => ({
          ...todo,
          type: "todo",
          time: "",
          place: "",
          isOnline: false,
          meetingLink: ""
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Modal creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState(null);

  // Form input states
  const [formType, setFormType] = useState("todo"); // "todo" or "meeting"
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formPlace, setFormPlace] = useState("");
  const [formIsOnline, setFormIsOnline] = useState(false);
  const [formMeetingLink, setFormMeetingLink] = useState("");

  // Modal details states
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  // Sync custom events to LocalStorage
  useEffect(() => {
    localStorage.setItem(`learnonline_customevents_${user?.userId || 'guest'}`, JSON.stringify(customEvents));
  }, [customEvents, user?.userId]);

  // Monitor open states of all modals and notify dashboard parent to trigger full backdrop blur/fade
  useEffect(() => {
    const isAnyOpen = !!selectedAssignment || !!selectedClass || isCreateModalOpen;
    if (onModalToggle) {
      onModalToggle(isAnyOpen);
    }
  }, [selectedAssignment, selectedClass, isCreateModalOpen, onModalToggle]);

  // Fetch events and assignments once on load
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const [eventData, assignmentData] = await Promise.all([
          getAllEvents(),
          user?.userId ? getStudentAssignments(user.userId) : Promise.resolve([]),
        ]);

        if (mounted) {
          setEvents(Array.isArray(eventData) ? eventData : []);
          setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        }
      } catch (err) {
        console.error("Failed fetching weekly timeline data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [user?.userId]);

  // Compute the 7 dates of the selected week (Mon -> Sun)
  const daysOfWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  // Navigate weeks
  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleResetToToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  // Open creation modal
  const openCreateModal = (dayDate) => {
    setCreateModalDate(dayDate);
    setFormType("todo");
    setFormTitle("");
    setFormTime("09:00");
    setFormPlace("");
    setFormIsOnline(false);
    setFormMeetingLink("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Submit custom event form
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newEvent = {
      id: `custom-event-${Date.now()}`,
      type: formType,
      title: formTitle.trim(),
      completed: false, // only applicable for todos
      date: createModalDate.toISOString(),
      time: formTime,
      place: formPlace.trim() || (formIsOnline ? "Online" : "TBA"),
      isOnline: formIsOnline,
      meetingLink: formIsOnline ? formMeetingLink.trim() : "",
    };

    setCustomEvents(prev => [...prev, newEvent]);
    closeCreateModal();

    // Play full confetti burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: formType === "todo" ? ["#3C0078", "#87CEFA"] : ["#FF8731", "#F472B6"]
    });
  };

  // Toggle custom todo status
  const handleToggleTodo = (id, event) => {
    event.stopPropagation(); // Avoid triggering details modal if any
    setCustomEvents(prev => prev.map(evt => {
      if (evt.id === id) {
        const nextState = !evt.completed;
        if (nextState) {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.35 },
            colors: ["#87CEFA", "#3C0078", "#FF8731"]
          });
        }
        return { ...evt, completed: nextState };
      }
      return evt;
    }));
  };

  // Delete custom event (both todo and custom meeting)
  const handleDeleteEvent = (id, event) => {
    event.stopPropagation();
    setCustomEvents(prev => prev.filter(t => t.id !== id));
  };

  // Filter lists of items for a specific day
  const getDayItems = (dayDate) => {
    const dayStr = dayDate.toDateString();

    const dayAssignments = assignments.filter(a => {
      const due = new Date(a.dueDate);
      return due.toDateString() === dayStr;
    });

    const dayClasses = [
      // Backend events
      ...events.filter(e => {
        const start = new Date(e.startTime);
        const isSameDay = start.toDateString() === dayStr;
        const type = e.eventType?.toLowerCase() || "";
        const isClassOrMeeting = type === "class" || type === "lecture" || type === "practical" || e.title?.toLowerCase().includes("meeting");
        return isSameDay && isClassOrMeeting;
      }),
      // Custom events of type "meeting"
      ...customEvents.filter(e => {
        return e.type === "meeting" && new Date(e.date).toDateString() === dayStr;
      }).map(c => ({
        id: c.id,
        title: c.title,
        startTime: new Date(new Date(c.date).setHours(c.time ? parseInt(c.time.split(":")[0]) : 9, c.time ? parseInt(c.time.split(":")[1]) : 0)),
        endTime: new Date(new Date(c.date).setHours(c.time ? parseInt(c.time.split(":")[0]) + 1 : 10, c.time ? parseInt(c.time.split(":")[1]) : 0)),
        eventType: "Meeting",
        description: `${c.title}|${c.isOnline ? 'Online' : (c.place || 'TBA')}`,
        createdBy: "Custom Scheduled",
        meetingLink: c.meetingLink,
        isCustom: true
      }))
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const dayTodos = customEvents.filter(t => {
      return t.type === "todo" && new Date(t.date).toDateString() === dayStr;
    });

    return {
      assignments: dayAssignments,
      classes: dayClasses,
      todos: dayTodos
    };
  };

  // Count totals for current week summary badge
  const weekTotals = useMemo(() => {
    let assignmentsCount = 0;
    let classesCount = 0;

    daysOfWeek.forEach(day => {
      const { assignments: dayA, classes: dayC } = getDayItems(day);
      assignmentsCount += dayA.length;
      classesCount += dayC.length;
    });

    return { assignmentsCount, classesCount };
  }, [daysOfWeek, assignments, events, customEvents]);

  const isToday = (dayDate) => {
    return dayDate.toDateString() === new Date().toDateString();
  };

  const isPastEvent = (date) => {
    const eventDate = new Date(date);
    const now = new Date();
    // Set to start of day to compare dates
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  return (
    <div className="w-full flex flex-col relative h-[360px] select-none p-1 mt-15 mb-15">

      {/* ── HEADER NAVIGATION ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-['Gabarito'] text-slate-800 leading-none">Timeline</h2>
          </div>
        </div>

        {/* Date range switcher */}
        <div className="flex items-center gap-4 bg-slate-100/80 border border-slate-200 p-1.5 rounded-2xl">
          <button
            onClick={handlePrevWeek}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-purple-700 active:scale-95 transition shadow-sm cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-bold text-slate-700 px-2 min-w-[200px] text-center font-['Gabarito']">
            {formatWeekRange(currentWeekStart)}
          </span>

          <button
            onClick={handleNextWeek}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-purple-700 active:scale-95 transition shadow-sm cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action + stats */}
        {/* <div className="flex items-center gap-3">
          <button
            onClick={handleResetToToday}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 active:scale-95 transition cursor-pointer font-['Gabarito']"
          >
            Go to Today
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-purple-600" /> {weekTotals.assignmentsCount} Due</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-orange-500" /> {weekTotals.classesCount} Classes</span>
          </div>
        </div> */}
      </div>

      {/* ── TIMELINE WORKSPACE ── */}
      <div className="flex-1 relative grid grid-cols-7 gap-2 items-stretch min-h-0">

        {/* Continuous horizontal timeline line */}
        <div
          className="absolute left-[calc(100%/14)] right-[calc(100%/14)] h-[3px] rounded-full pointer-events-none opacity-60"
          style={{
            top: 'calc(50% - 1.5px)',
            background: '#d4d4d4'
          }}
        />

        {daysOfWeek.map((dayDate, idx) => {
          const { assignments: dayA, classes: dayC, todos: dayT } = getDayItems(dayDate);
          const dayToday = isToday(dayDate);
          const hasItems = dayA.length > 0 || dayT.length > 0 || dayC.length > 0;
          const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });
          const dateNum = dayDate.getDate();

          return (
            <div key={idx} className="group flex flex-col items-center flex-1 min-w-0 relative overflow-hidden">

              {/* TOP AREA: Assignments & Todo Items (scrollable container) */}
              <div className="flex-1 w-full flex flex-col justify-end items-center gap-1.5 pb-2.5 min-h-0 overflow-y-auto scrollbar-hide">
                <AnimatePresence>
                  {/* Assignments */}
                  {dayA.map(assignment => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={assignment.id}
                      onClick={() => setSelectedAssignment(assignment)}
                      className={`w-full max-w-[135px] h-10 truncate text-[0.8rem] font-bold py-1 px-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 text-left shrink-0 ${isPastEvent(assignment.dueDate) ? 'bg-gray-100 text-gray-400 hover:bg-gray-150' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      title={`${assignment.course?.subject?.code || 'UX300'}: ${assignment.title}`}
                    >
                      <Award className={`w-3 h-3 shrink-0 ${isPastEvent(assignment.dueDate) ? 'text-gray-400' : 'text-purple-500'}`} />
                      <span className="truncate">{assignment.course?.subject?.code || "UX"}: {assignment.title}</span>
                    </motion.div>
                  ))}

                  {/* Custom Todos */}
                  {dayT.map(todo => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={todo.id}
                      onClick={(e) => handleToggleTodo(todo.id, e)}
                      className={`group/todo w-full max-w-[135px] truncate text-[10px] py-1 px-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition shadow-sm text-left shrink-0 ${isPastEvent(todo.date) ? (
                        todo.completed
                          ? 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                          : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150 font-medium'
                      ) : (
                        todo.completed
                          ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                          : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100/80 font-medium'
                      )
                        }`}
                      title={`${todo.title} ${todo.time ? `(${todo.time})` : ''}`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${todo.completed ? 'bg-teal-500 border-teal-500 text-white' : isPastEvent(todo.date) ? 'border-gray-400 bg-white' : 'border-slate-300 bg-white'
                          }`}>
                          {todo.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{todo.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteEvent(todo.id, e)}
                        className="opacity-0 group-hover/todo:opacity-100 text-slate-400 hover:text-red-500 shrink-0 ml-1 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* PLUS BUTTON TRIGGER FOR CREATION MODAL */}
                <button
                  onClick={() => openCreateModal(dayDate)}
                  className="w-5 h-5 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-600 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200/50 hover:border-purple-200 shadow-sm transition active:scale-95 cursor-pointer mt-1 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-within:opacity-100"
                  title="Create custom event"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CONNECTIVE TOP DOTTED LINE */}
              <div className={`w-[2px] h-4 border-l-2 transition opacity-0 group-hover:opacity-100 ${dayA.length > 0 || dayT.length > 0 ? 'border-gray-300' : 'border-gray-200'
                }`} />

              {/* ── TIMELINE AXIS DOT ── */}
              <div
                onClick={() => openCreateModal(dayDate)}
                className={`w-9 h-9 rounded-full flex flex-col items-center justify-center transition duration-300 hover:scale-110 cursor-pointer shadow-md z-10 font-['Gabarito'] ${dayToday
                  ? 'bg-purple-600 border-purple-600 text-white ring-4 ring-purple-100 shadow-purple-500/20 scale-105'
                  : hasItems
                    ? 'bg-white border-purple-400 text-slate-800'
                    : 'bg-white border-slate-300 text-slate-500 hover:border-purple-400 hover:text-purple-600'
                  }`}
                title={dayToday ? "Today (Click to add task)" : "Click to add task"}
              >
                <span className="text-[12px] font-bold leading-none">{dateNum}</span>
                <span className="text-[8px] uppercase tracking-wide leading-none mt-0.5 font-bold">{dayLabel}</span>
              </div>

              {/* CONNECTIVE BOTTOM DOTTED LINE */}
              <div className={`w-[2px] h-4 border-l-2 transition opacity-0 group-hover:opacity-100 ${dayC.length > 0 ? 'border-gray-300' : 'border-gray-200'
                }`} />

              {/* BOTTOM AREA: Classes & Meetings */}
              <div className="flex-1 w-full flex flex-col justify-start items-center gap-1.5 pt-2.5 min-h-0 overflow-y-auto scrollbar-hide">
                <AnimatePresence>
                  {dayC.map(cls => {
                    const start = new Date(cls.startTime);
                    const timeStr = cls.isCustom
                      ? (cls.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))
                      : `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;

                    const room = cls.description?.includes("|") ? cls.description.split("|")[1] : "Room";
                    const isOnline = room.toLowerCase().includes("online");
                    const isPast = isPastEvent(cls.startTime);

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className={`group/meeting w-full max-w-[135px] text-left text-[0.8rem] p-1.5 rounded-lg cursor-pointer transition flex flex-col gap-0.5 leading-tight shrink-0 relative ${isPast ? 'bg-gray-100 border border-gray-200 hover:bg-gray-150' : (cls.isCustom ? 'bg-white border-dashed border-orange-200 hover:bg-orange-100' : 'bg-purple-50 border border-purple-200 hover:bg-purple-200/80')
                          }`}
                        title={cls.title}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-bold truncate ${isPast ? 'text-gray-400' : ''}`}>{cls.title}</span>
                          {cls.isCustom && (
                            <button
                              onClick={(e) => handleDeleteEvent(cls.id, e)}
                              className="opacity-0 group-hover/meeting:opacity-100 text-orange-400 hover:text-red-500 shrink-0 ml-1 transition-opacity"
                              title="Delete custom meeting"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-[0.7rem] font-semibold shrink-0 mt-0.5 ${isPast ? 'text-gray-300' : 'text-gray-400'}`}>
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {timeStr}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 shrink-0 truncate max-w-[50px]">
                            {isOnline ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                            {room}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {dayC.length === 0 && (
                  <span className="text-[9px] font-semibold text-slate-300 italic pt-1">Free day</span>
                )}
              </div>

            </div>
          );
        })}

      </div>

      {/* ── MODAL: TASK/EVENT CREATOR MODAL ── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[28px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-[10000]"
            >


              <div className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold font-['Gabarito'] text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span>Create Custom Event</span>
                  </h3>
                  <button
                    onClick={closeCreateModal}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs font-semibold text-slate-400 mb-5">
                  Scheduled for: {createModalDate?.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Type Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setFormType("todo")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${formType === "todo"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/40"
                      }`}
                  >
                    📝 Task / Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("meeting")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${formType === "meeting"
                      ? "bg-white text-orange-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/40"
                      }`}
                  >
                    👥 Class / Meeting
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {formType === "todo" ? "Task Title" : "Meeting / Class Title"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formType === "todo" ? "e.g., Finish Lit Review essay" : "e.g., Visual Semiotics Study Session"}
                      className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition font-semibold text-slate-700"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>

                  {/* Time & Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
                      <input
                        type="time"
                        className="w-full text-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition font-semibold text-slate-700"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location / Room</label>
                      <input
                        type="text"
                        disabled={formIsOnline}
                        placeholder={formIsOnline ? "Online Session" : "e.g., Room 304"}
                        className="w-full text-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition font-semibold text-slate-700 disabled:opacity-50 disabled:bg-slate-100"
                        value={formIsOnline ? "Online" : formPlace}
                        onChange={(e) => setFormPlace(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Online checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                        checked={formIsOnline}
                        onChange={(e) => {
                          setFormIsOnline(e.target.checked);
                          if (e.target.checked) setFormPlace("Online");
                          else setFormPlace("");
                        }}
                      />
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 select-none">
                        <Video className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        This is an online/virtual session
                      </span>
                    </label>
                  </div>

                  {/* Meeting URL */}
                  <AnimatePresence>
                    {formIsOnline && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Meeting URL / Link</label>
                          <input
                            type="url"
                            required={formIsOnline}
                            placeholder="https://teams.microsoft.com/l/meetup-join/..."
                            className="w-full text-[11px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition font-semibold text-slate-700"
                            value={formMeetingLink}
                            onChange={(e) => setFormMeetingLink(e.target.value)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-md active:scale-95 ${formType === "todo"
                        ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                        : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                        }`}
                    >
                      Create Event
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ASSIGNMENT DETAIL VIEW ── */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[24px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
            >


              <div className="p-6">
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100">
                    {selectedAssignment.course?.subject?.code || "UX300"} Assignment
                  </span>
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-xl font-bold font-['Gabarito'] text-slate-800 mt-4 leading-snug">
                  {selectedAssignment.title}
                </h3>

                <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Due: {new Date(selectedAssignment.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>

                <div className="my-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed font-medium">
                    {selectedAssignment.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    Max Marks: <span className="text-purple-600">{selectedAssignment.maxPoints || 100}</span>
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition"
                    >
                      Close
                    </button>
                    <a
                      href={`/courses/${selectedAssignment.courseId}/assignments/${selectedAssignment.id}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shadow-md shadow-purple-500/20"
                    >
                      Open Assignment <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CLASS/MEETING DETAIL VIEW ── */}
      <AnimatePresence>
        {selectedClass && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[24px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
            >



              <div className="p-6">
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-100 capitalize">
                    {selectedClass.eventType || "Class"}
                  </span>
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-xl font-bold font-['Gabarito'] text-slate-800 mt-4 leading-snug">
                  {selectedClass.title}
                </h3>

                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>
                      {selectedClass.isCustom ? (
                        `${selectedClass.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      ) : (
                        `${new Date(selectedClass.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedClass.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({Math.round((new Date(selectedClass.endTime) - new Date(selectedClass.startTime)) / 60000)} mins)`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                    {selectedClass.description?.includes("Online") || selectedClass.description?.toLowerCase().includes("virtual") || selectedClass.description?.toLowerCase().includes("teams") ? (
                      <Video className="w-4 h-4 text-orange-500 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    )}
                    <span>
                      Location: {selectedClass.description?.includes("|") ? selectedClass.description.split("|")[1] : "TBA"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                    <User className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Lecturer: {selectedClass.createdBy || "Unspecified"}</span>
                  </div>
                </div>

                <div className="my-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 font-medium">
                  {selectedClass.description?.includes("|") ? selectedClass.description.split("|")[0] : selectedClass.description || "Class session details."}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition"
                  >
                    Close
                  </button>
                  {(selectedClass.meetingLink || selectedClass.description?.toLowerCase().includes("online")) && (
                    <a
                      href={selectedClass.meetingLink || "https://teams.microsoft.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shadow-md shadow-orange-500/20"
                    >
                      Join Meeting <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
