import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdEditNote, MdPeopleOutline } from "react-icons/md";
import { ChevronRight } from "lucide-react";
import NextClassItem from "./UI/nextClassItem";
import { getCourseAssignments } from "../services/assignmentService";
import { getCourseSubmissions } from "../services/submissionService";
import { getCourseAttendance } from "../services/attendanceService";
import { getAllEvents } from "../services/eventService";
import { getCourseGrades } from "../services/gradeService";

const BRAND = "#3C0078";
const BRAND_TINT = "#3C007812";
const MIN_LOADING_MS = 1500;

function SkeletonRow() {
    return (
        <div className="my-2 rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-3 px-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
            </div>
        </div>
    );
}

function SectionLabel({ children, className = "" }) {
    return (
        <p className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${className}`}>
            {children}
        </p>
    );
}

export default function TeacherCourseGlanceDisplay({ activeCourseId }) {
    const [loading, setLoading] = useState(false);
    const [gradingTasks, setGradingTasks] = useState([]);
    const [nextClass, setNextClass] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        async function fetchData() {
            if (!activeCourseId) return;
            try {
                setLoading(true);

                const [assignmentsData, submissionsData, gradesData, attendanceData, eventsData] = await Promise.all([
                    getCourseAssignments(activeCourseId).catch(() => []),
                    getCourseSubmissions(activeCourseId).catch(() => []),
                    getCourseGrades(activeCourseId).catch(() => []),
                    getCourseAttendance(activeCourseId).catch(() => []),
                    getAllEvents().catch(() => []),
                    new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
                ]);

                if (!mounted) return;

                const gradedSubmissionIds = new Set(
                    (Array.isArray(gradesData) ? gradesData : []).map(g => g.submissionId)
                );
                const tasks = assignmentsData
                    .map(assignment => {
                        const pendingSubmissions = submissionsData.filter(
                            sub => sub.assignmentId === assignment.id && !gradedSubmissionIds.has(sub.id)
                        );
                        return { id: assignment.id, title: assignment.title, pendingCount: pendingSubmissions.length };
                    })
                    .filter(task => task.pendingCount > 0);

                setGradingTasks(tasks);

                const now = new Date();
                const futureEvents = eventsData
                    .filter(e => {
                        if (e.courseId !== activeCourseId) return false;
                        if (new Date(e.startTime) <= now) return false;
                        const type = e.eventType?.toLowerCase() || "";
                        return type === "class" || type === "lecture" || type === "practical";
                    })
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                if (futureEvents.length > 0) {
                    const next = futureEvents[0];
                    const start = new Date(next.startTime);
                    const end = new Date(next.endTime);
                    let room = "TBA";
                    if (next.description && next.description.includes("|")) {
                        room = next.description.split("|")[1] || "TBA";
                    }
                    setNextClass({
                        subject: next.title || "Class",
                        date: start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
                        time: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`,
                        room,
                    });
                } else {
                    setNextClass(null);
                }

                if (attendanceData && attendanceData.length > 0) {
                    const total = attendanceData.length;
                    const attended = attendanceData.filter(r => r.status !== "Absent").length;
                    const overallRate = Math.round((attended / total) * 100);
                    const totalSessions = new Set(attendanceData.map(r => r.date?.split("T")[0])).size;
                    setAttendanceStats({ rate: overallRate, sessions: totalSessions });
                } else {
                    setAttendanceStats(null);
                }

            } catch (err) {
                console.error("Failed to fetch teacher glance data:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchData();
        return () => { mounted = false; };
    }, [activeCourseId]);

    if (!activeCourseId) {
        return <p className="text-xs text-gray-400 py-2">Select a course to see details.</p>;
    }

    if (loading) {
        return (
            <div className="w-full mt-4 space-y-1">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
            </div>
        );
    }

    return (
        <div className="w-full h-fit rounded-2xl mt-4">
            <SectionLabel>Pending Grading</SectionLabel>
            {gradingTasks.length === 0 ? (
                <div className="my-2 bg-white rounded-xl border border-dashed border-gray-200 w-full h-12 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium">All assignments graded</span>
                </div>
            ) : (
                gradingTasks.map(task => (
                    <div
                        key={task.id}
                        className="my-2 bg-white rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-2 transition-colors duration-150 hover:bg-gray-50/60 hover:border-gray-200 cursor-pointer"
                        onClick={() => navigate(`/courses/${activeCourseId}/assignments`)}
                    >
                        <div
                            className="w-9 h-9 rounded-full ml-2 flex items-center justify-center shrink-0"
                            style={{ backgroundColor: BRAND_TINT }}
                        >
                            <MdEditNote className="w-5 h-5" style={{ color: BRAND }} />
                        </div>

                        <div className="ml-2 flex flex-col justify-center space-y-0.5 flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{task.title}</h3>
                            <p className="text-xs text-gray-400">
                                {task.pendingCount} submission{task.pendingCount !== 1 ? "s" : ""} to grade
                            </p>
                        </div>

                        <div className="w-9 h-9 flex items-center justify-center mr-2 shrink-0">
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                    </div>
                ))
            )}

            <SectionLabel className="mt-5">Next Class</SectionLabel>
            {nextClass ? (
                <NextClassItem subject={nextClass.subject} date={nextClass.date} time={nextClass.time} room={nextClass.room} />
            ) : (
                <p className="text-xs text-gray-400 py-2">No upcoming classes scheduled</p>
            )}

            <SectionLabel className="mt-5">Attendance Rate</SectionLabel>
            {attendanceStats ? (
                <div
                    className="my-2 bg-white rounded-xl border border-gray-200 w-full h-14 flex flex-row items-center space-x-2 transition-colors duration-150 hover:bg-gray-50/60 hover:border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/courses/${activeCourseId}/attendance`)}
                >
                    <div className="w-9 h-9 bg-teal-50 rounded-full ml-2 flex items-center justify-center shrink-0">
                        <MdPeopleOutline className="w-5 h-5 text-teal-500" />
                    </div>

                    <div className="ml-2 flex flex-col justify-center space-y-0.5 flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800">Class Presence</h3>
                        <p className="text-xs text-gray-400">
                            Across {attendanceStats.sessions} session{attendanceStats.sessions !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="mr-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            attendanceStats.rate >= 80
                                ? "bg-green-50 text-green-600"
                                : "bg-red-50 text-red-500"
                        }`}>
                            {attendanceStats.rate}%
                        </span>
                    </div>

                    <div className="w-9 h-9 flex items-center justify-center mr-1 shrink-0">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                </div>
            ) : (
                <p className="text-xs text-gray-400 py-2">No attendance records logged yet</p>
            )}
        </div>
    );
}
