import React from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "@solar-icons/react";
import { motion } from "framer-motion";
import { getCourseAssignments } from "../../../services/assignmentService";
import { getStudentSubmissions } from "../../../services/submissionService";
import { getStudentGrades } from "../../../services/gradeService";
import { useAuth } from "../../../contexts/AuthContext";
import { staggerContainer, slideUp } from "./constants";

export default function CourseAssignmentsView({ subject, activeCourseId }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [assignments, setAssignments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const computeStatusInfo = (item, submission, grade) => {
        // Only show Graded status when grade has been released to the student
        if (grade && grade.isReleased) {
            return {
                status: 'Graded',
                color: 'text-purple-600',
                rank: 5,
                isGraded: true,
                gradePercent: Math.round((grade.pointsEarned / item.maxPoints) * 100)
            };
        }
        if (submission) {
            return { status: 'Submitted', color: 'text-green-600', rank: 4, isSubmitted: true };
        }
        if (item.isClosed) return { status: 'Closed', color: 'text-gray-400', rank: 3, isClosed: true };

        const now = new Date();
        const due = new Date(item.dueDate);
        const diffDays = (due - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) return { status: 'Late', color: 'text-red-600', rank: 0 };
        if (diffDays <= 5) return { status: 'Due Soon', color: 'text-orange-500', rank: 1 };
        return { status: 'Due', color: 'text-blue-500', rank: 2 };
    };

    React.useEffect(() => {
        let mounted = true;
        async function fetchData() {
            if (!activeCourseId || !user?.userId) return;
            try {
                setLoading(true);
                const [data, submissions, grades] = await Promise.all([
                    getCourseAssignments(activeCourseId),
                    getStudentSubmissions(user.userId),
                    getStudentGrades(user.userId)
                ]);

                // Cross-reference assignments with real submissions and grades
                const enriched = data.map(item => {
                    const sub = submissions.find(s => s.assignmentId === item.id);
                    const grade = sub ? grades.find(g => g.submissionId === sub.id) : null;
                    const info = computeStatusInfo(item, sub, grade);
                    return { ...item, ...info };
                }).sort((a, b) => a.rank - b.rank);

                if (mounted) setAssignments(enriched);
            } catch (err) {
                console.error("Failed bringing in assignments for course:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchData();
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    return (
        <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Assignments</h1>
                </div>
            </motion.header>
            
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4 gap-4">
                                    <div className="h-6 rounded-full bg-gray-200 flex-1" style={{ maxWidth: `${55 + (i * 13) % 30}%` }} />
                                    <div className="h-4 rounded-full bg-gray-100 w-16 mt-1 shrink-0" />
                                </div>
                                <div className="flex flex-col gap-2 mb-6">
                                    <div className="h-3 rounded-full bg-gray-100 w-full" />
                                    <div className="h-3 rounded-full bg-gray-100 w-4/5" />
                                </div>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <div className="h-3 rounded-full bg-gray-100 w-14" />
                                    <div className="h-3 rounded-full bg-gray-100 w-12" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="h-3 rounded-full bg-gray-100 w-16" />
                                    <div className="h-3 rounded-full bg-gray-100 w-24" />
                                </div>
                                <div className="h-12 rounded-2xl bg-gray-100 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <div className="text-gray-500 text-center py-20 font-medium bg-gray-50 rounded-3xl border border-gray-200">
                    No active assignments for this module yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                    {assignments.map((item, index) => (
                        <motion.div key={item.id} variants={slideUp} className={`bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition duration-300 flex flex-col justify-between ${item.isClosed || item.isSubmitted || item.isGraded ? 'opacity-60 bg-gray-50' : 'opacity-100'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand transition-colors leading-tight pr-4">{item.title}</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap mt-1 ${item.color}`}>{item.status}</span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-6">{item.description}</p>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 uppercase font-bold tracking-wider">Weight:</span>
                                    <span className="text-gray-900 font-bold">{item.maxPoints} pts</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 uppercase font-bold tracking-wider">Due Date:</span>
                                    <span className="text-gray-900 font-bold">{new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                {item.isGraded && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 uppercase font-bold tracking-wider">Grade:</span>
                                        <span className="text-purple-600 font-bold">{item.gradePercent}%</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => navigate(`/courses/${activeCourseId}/assignments/${item.id}`)}
                                    className={`w-full mt-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition flex items-center justify-center gap-2 shadow-sm ${item.isClosed || item.isSubmitted || item.isGraded ? 'bg-gray-800 hover:bg-black' : 'bg-brand hover:bg-brand-deep'}`}>
                                    {(!item.isClosed && !item.isSubmitted && !item.isGraded) && <Upload size={16} />}
                                    {item.isGraded ? "View Grade" : item.isClosed ? "View" : item.isSubmitted ? "View Submission" : "View & Submit"}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
