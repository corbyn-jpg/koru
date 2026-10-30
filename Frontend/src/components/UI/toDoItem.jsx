import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdEditNote } from "react-icons/md";
import { ChevronRight } from "lucide-react";
import { getCourseAssignments } from "../../services/assignmentService";
import { getStudentSubmissions } from "../../services/submissionService";
import { useAuth } from "../../contexts/AuthContext";

const BRAND = "#3C0078";
const BRAND_TINT = "#3C007812";
const MIN_LOADING_MS = 1500;

function SkeletonRow() {
    return (
        <div className="my-2 rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
            </div>
        </div>
    );
}

export default function ToDoItem({ activeCourseId }) {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;
        async function fetchAssignments() {
            if (!activeCourseId) {
                setTodos([]);
                return;
            }
            try {
                setLoading(true);
                const [data, submissions] = await Promise.all([
                    getCourseAssignments(activeCourseId),
                    user?.userId ? getStudentSubmissions(user.userId).catch(() => []) : Promise.resolve([]),
                    new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
                ]);

                const submittedAssignmentIds = new Set(
                    (Array.isArray(submissions) ? submissions : []).map(s => s.assignmentId)
                );

                const now = new Date();
                const upcoming = data
                    .filter(a => new Date(a.dueDate) > now && !submittedAssignmentIds.has(a.id))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 3)
                    .map(a => {
                        const due = new Date(a.dueDate);
                        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                        let dueLabel = "Due soon";
                        if (diffDays === 1) dueLabel = "Due tomorrow";
                        else if (diffDays <= 7) dueLabel = `Due in ${diffDays} days`;
                        else dueLabel = `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                        return { id: a.id, courseId: activeCourseId, title: a.title, due: dueLabel };
                    });

                if (mounted) setTodos(upcoming);
            } catch (err) {
                console.error("Failed to load upcoming to-dos:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchAssignments();
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    if (loading) {
        return <>{[1, 2].map(i => <SkeletonRow key={i} />)}</>;
    }

    if (todos.length === 0) {
        return <p className="text-xs text-gray-400 py-2">No upcoming tasks</p>;
    }

    return (
        <>
            {todos.map((todo, idx) => (
                <div
                    key={idx}
                    className="my-2 bg-white rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-2 transition-colors duration-150 hover:bg-gray-50/60 hover:border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/courses/${todo.courseId}/assignments/${todo.id}`)}
                >
                    <div
                        className="w-9 h-9 rounded-full ml-2 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: BRAND_TINT }}
                    >
                        <MdEditNote className="w-5 h-5" style={{ color: BRAND }} />
                    </div>

                    <div className="ml-2 flex flex-col justify-center space-y-0.5 flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 truncate">{todo.title}</h3>
                        <p className="text-xs text-gray-400">{todo.due}</p>
                    </div>

                    <div className="w-9 h-9 flex items-center justify-center mr-2 shrink-0">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                </div>
            ))}
        </>
    );
}
