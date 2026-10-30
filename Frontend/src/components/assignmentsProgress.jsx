import { useState, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import AssignmentItem from "./UI/assignmentItem";
import ProgressRing from "./UI/progressRing";
import { useAuth } from "../contexts/AuthContext";
import { getStudentAssignments } from "../services/assignmentService";
import { getStudentSubmissions } from "../services/submissionService";
import { getStudentStats } from "../services/attendanceService";

const MIN_LOADING_MS = 1500;

function SkeletonAssignment() {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
      </div>
      <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

function SkeletonRing() {
  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-20 h-2.5 bg-gray-100 rounded-full animate-pulse" />
      <div className="w-28 h-28 rounded-full bg-gray-100 animate-pulse" />
    </div>
  );
}

export default function AssignmentsProgress() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [loading, setLoading] = useState(true);

  const getRankAndState = (dbAssignment, submissions) => {
    const submitted = submissions.some(s => s.assignmentId === dbAssignment.id);
    if (submitted) return { rank: 4, uiState: "Submitted", isCompleted: true };
    if (dbAssignment.isClosed) return { rank: 3, uiState: "Closed", isCompleted: false };
    const now = new Date();
    const due = new Date(dbAssignment.dueDate);
    const diffDays = (due - now) / (1000 * 60 * 60 * 24);
    if (diffDays < -7) return { rank: 3, uiState: "Closed", isCompleted: false };
    if (diffDays < 0)  return { rank: 0, uiState: "Late",   isCompleted: false };
    if (diffDays <= 5) return { rank: 1, uiState: "Due Soon", isCompleted: false };
    return { rank: 2, uiState: "Due", isCompleted: false };
  };

  useEffect(() => {
    let mounted = true;
    async function fetchAssignmentsAndStats() {
      if (!user?.userId) return;
      try {
        setLoading(true);
        const [data, subs, stats] = await Promise.all([
          getStudentAssignments(user.userId),
          getStudentSubmissions(user.userId).catch(() => []),
          getStudentStats(user.userId).catch(() => null),
          new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
        ]);

        const mapped = data.map(dbAssignment => {
          const { rank, uiState, isCompleted } = getRankAndState(dbAssignment, subs || []);
          return {
            id: dbAssignment.id,
            courseId: dbAssignment.courseId,
            title: dbAssignment.title,
            dueDate: new Date(dbAssignment.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
            courseCode: dbAssignment.course?.subject?.code || "N/A",
            completed: isCompleted,
            rank,
            uiState,
          };
        }).sort((a, b) => a.rank - b.rank);

        if (mounted) {
          setAssignments(mapped);
          if (stats && typeof stats.overallAttendanceRate === "number") {
            setAttendanceRate(stats.overallAttendanceRate);
          }
        }
      } catch (err) {
        console.error("Failed loading data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAssignmentsAndStats();
    return () => { mounted = false; };
  }, [user?.userId]);

  function fireConfetti() {
    const colors = ["#3C0078", "#FF8731", "#87CEFA"];
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.25, y: 0.3 }, colors, gravity: 0.8, scalar: 1.1 });
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.75, y: 0.3 }, colors, gravity: 0.8, scalar: 1.1 });
    document.body.classList.add("orbs-vibrant");
    setTimeout(() => document.body.classList.remove("orbs-vibrant"), 3000);
  }

  function toggleAssignment(id) {
    const target = assignments.find((a) => a.id === id);
    if (target && !target.completed) fireConfetti();
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  }

  const progress = useMemo(() => {
    if (assignments.length === 0) return 0;
    const done = assignments.filter((a) => a.completed).length;
    return Math.round((done / assignments.length) * 100);
  }, [assignments]);

  const nextThree = useMemo(
    () => assignments.filter((a) => !a.completed).slice(0, 3),
    [assignments]
  );

  return (
    <div className="w-full h-full flex flex-col bg-white/70 border border-gray-200 rounded-3xl p-4">
      <div className="flex items-center justify-between mt-5 mb-5">
        <h2 className="text-2xl font-['Gabarito']">Assignments</h2>
      </div>

      <div className="flex flex-col pr-2">
        <div className="flex flex-col gap-3">
          {loading ? (
            <>{[0, 1, 2].map(i => <SkeletonAssignment key={i} />)}</>
          ) : nextThree.length === 0 ? (
            <p className="text-sm text-gray-400 font-medium text-center mt-8">No upcoming assignments.</p>
          ) : (
            nextThree.map((assignment) => (
              <AssignmentItem
                key={assignment.id}
                assignmentId={assignment.id}
                courseId={assignment.courseId}
                title={assignment.title}
                dueDate={assignment.dueDate}
                courseCode={assignment.courseCode}
                completed={assignment.completed}
                uiState={assignment.uiState}
                onToggle={() => toggleAssignment(assignment.id)}
              />
            ))
          )}
        </div>

        {/* Progress section pushed to bottom of equalised card via mt-auto */}
        <h2 className="text-2xl font-['Gabarito'] mt-auto pt-8 mb-4">Progress & Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <>{[0, 1].map(i => <SkeletonRing key={i} />)}</>
          ) : (
            <>
              <div className="p-4 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand opacity-60 mb-2">Assignments</span>
                <ProgressRing percentage={progress} size={110} strokeWidth={8} />
              </div>
              <div className="p-4 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand opacity-60 mb-2">Attendance</span>
                <ProgressRing percentage={attendanceRate} size={110} strokeWidth={8} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
