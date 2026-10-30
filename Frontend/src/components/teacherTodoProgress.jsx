import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdEditNote } from "react-icons/md";
import { Plus, Mail, FileText } from "lucide-react";
import confetti from "canvas-confetti";
import ProgressRing from "./UI/progressRing";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../contexts/CoursesContext";
import { getTeacherTodos, createTodo, toggleTodo as apiToggleTodo } from "../services/todoService";
import { getCourseSubmissions } from "../services/submissionService";
import { getCourseGrades } from "../services/gradeService";

const MIN_LOADING_MS = 1500;

const theme = {
  teacher: {
    icon: "bg-brand/8",
    iconText: "text-brand",
    checkbox: "border-brand bg-brand",
    checkboxHover: "hover:border-brand",
    badge: "bg-brand/10 text-brand",
    dot: "bg-brand",
  },
  admin: {
    icon: "bg-ember/10",
    iconText: "text-ember",
    checkbox: "border-ember bg-ember",
    checkboxHover: "hover:border-ember",
    badge: "bg-ember/10 text-ember",
    dot: "bg-ember",
  },
  shared: {
    icon: "bg-emerald-50",
    iconText: "text-emerald-600",
    checkbox: "border-emerald-500 bg-emerald-500",
    checkboxHover: "hover:border-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

function formatDueDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day} at ${hours}:${mins}`;
}

function SkeletonTodo() {
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
      </div>
      <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

export default function TeacherTodoProgress() {
  const { user } = useAuth();
  const { visibleCourses } = useCourses();
  const [todos, setTodos] = useState([]);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [shareMode, setShareMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;
    let mounted = true;
    async function load() {
      try {
        const courseIds = (visibleCourses || []).map(c => c.id);
        const [data, ...courseResults] = await Promise.all([
          getTeacherTodos(user.userId),
          ...courseIds.map(id =>
            Promise.all([
              getCourseSubmissions(id).catch(() => []),
              getCourseGrades(id).catch(() => []),
            ])
          ),
          new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
        ]);

        if (mounted) {
          setTodos(data);

          let totalSubs = 0;
          let gradedSubs = 0;
          courseResults.forEach(result => {
            if (!Array.isArray(result)) return;
            const [subs, grades] = result;
            const gradedIds = new Set((Array.isArray(grades) ? grades : []).map(g => g.submissionId));
            totalSubs += (Array.isArray(subs) ? subs : []).length;
            gradedSubs += (Array.isArray(subs) ? subs : []).filter(s => gradedIds.has(s.id)).length;
          });
          setGradingProgress(totalSubs > 0 ? Math.round((gradedSubs / totalSubs) * 100) : 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user?.userId, visibleCourses]);

  function fireConfetti() {
    const colors = ["#3C0078", "#FF8731", "#87CEFA"];
    confetti({ particleCount: 60, spread: 55, origin: { x: 0.75, y: 0.3 }, colors, gravity: 0.8, scalar: 1 });
    document.body.classList.add("orbs-vibrant");
    setTimeout(() => document.body.classList.remove("orbs-vibrant"), 3000);
  }

  async function handleToggle(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    if (!target.isCompleted) fireConfetti();
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
    try {
      await apiToggleTodo(id);
    } catch (err) {
      console.error(err);
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
    }
  }

  async function handleAdd() {
    if (!newTitle.trim() || !user?.userId) return;
    try {
      const created = await createTodo({
        title: newTitle.trim(),
        dueDate: newDue ? formatDueDate(newDue) : null,
        teacherId: user.userId,
        sharedWithCoLecturers: shareMode,
      });
      setTodos((prev) => [...prev, created]);
    } catch (err) {
      console.error(err);
    }
    setNewTitle("");
    setNewDue("");
    setShareMode(false);
    setIsAdding(false);
  }

  const progress = useMemo(() => {
    if (todos.length === 0) return 0;
    const done = todos.filter((t) => t.isCompleted).length;
    return Math.round((done / todos.length) * 100);
  }, [todos]);

  return (
    <div className="w-full h-full flex flex-col bg-white/70 border border-gray-200 rounded-3xl p-4">
      <div className="flex items-center justify-between mt-5 mb-1">
        <h2 className="text-2xl font-['Gabarito']">To Do</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Add to-do"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
              />
              <input
                type="datetime-local"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
              />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShareMode(false)}
                  className={`flex-1 py-2 transition-colors ${!shareMode ? "bg-brand text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  Just me
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode(true)}
                  className={`flex-1 py-2 border-l border-gray-200 transition-colors ${shareMode ? "bg-brand text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  Share with co-lecturers
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-brand rounded-lg hover:bg-brand-deep transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3 pr-2">
        {loading ? (
          <>{[0, 1, 2].map(i => <SkeletonTodo key={i} />)}</>
        ) : (
          <AnimatePresence>
            {todos.map((todo) => {
              const isAdminTodo  = !!todo.createdByAdminId;
              const isSharedTodo = !!todo.sharedByTeacherId;
              const colors = isAdminTodo ? theme.admin : isSharedTodo ? theme.shared : theme.teacher;
              return (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`w-full border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition duration-300 cursor-pointer
                    ${todo.isCompleted ? "bg-gray-50/60 border-gray-200 opacity-40" : "bg-white/80 border-gray-200 hover:border-gray-200"}`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${todo.isCompleted ? "bg-gray-100" : colors.icon}`}>
                      <MdEditNote className={`w-5 h-5 ${todo.isCompleted ? "text-gray-400" : colors.iconText}`} />
                    </div>
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${todo.isCompleted ? "bg-gray-300" : colors.dot}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-base font-semibold leading-tight font-['Gabarito'] ${todo.isCompleted ? "text-gray-400 line-through" : "text-black"}`}>
                      {todo.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                      {todo.dueDate && <span>{todo.dueDate}</span>}
                      {todo.courseCode && <span className="font-bold text-black">{todo.courseCode}</span>}
                      {isAdminTodo && todo.createdByAdminName && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge}`}>{todo.createdByAdminName}</span>
                      )}
                      {isSharedTodo && todo.sharedByTeacherName && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge}`}>{todo.sharedByTeacherName}</span>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(todo.id); }}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition duration-200
                      ${todo.isCompleted ? colors.checkbox : `border-gray-300 ${colors.checkboxHover}`}`}
                    aria-label={`Toggle ${todo.title}`}
                  >
                    {todo.isCompleted && (
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
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Progress section anchored to bottom of equalised card via mt-auto */}
      <h2 className="text-2xl font-['Gabarito'] mt-auto pt-8 mb-4">Progress & Stats</h2>
      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <>{[0, 1].map(i => (
            <div key={i} className="p-4 flex flex-col items-center gap-3">
              <div className="w-20 h-2.5 bg-gray-100 rounded-full animate-pulse" />
              <div className="w-28 h-28 rounded-full bg-gray-100 animate-pulse" />
            </div>
          ))}</>
        ) : (
          <>
            <div className="p-4 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand opacity-60 mb-2">To-do</span>
              <ProgressRing percentage={progress} size={110} strokeWidth={8} />
            </div>
            <div className="p-4 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand opacity-60 mb-2">Graded</span>
              <ProgressRing percentage={gradingProgress} size={110} strokeWidth={8} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
