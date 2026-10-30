import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCourseAssignments } from "../../../services/assignmentService";
import { getStudentSubmissions } from "../../../services/submissionService";
import { getStudentGrades } from "../../../services/gradeService";
import { useAuth } from "../../../contexts/AuthContext";
import { staggerContainer, slideUp } from "./constants";

export default function CourseGradesView({ subject, activeCourseId }) {
    const { user } = useAuth();
    const [gradesData, setGradesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [avgGrade, setAvgGrade] = useState("-");

    useEffect(() => {
        let mounted = true;
        async function fetchGrades() {
            if (!activeCourseId || !user?.userId) return;
            try {
                setLoading(true);
                const [assignments, submissions, grades] = await Promise.all([
                    getCourseAssignments(activeCourseId),
                    getStudentSubmissions(user.userId),
                    getStudentGrades(user.userId)
                ]);

                let totalPoints = 0;
                let earnedPoints = 0;

                const mapped = assignments.map(a => {
                    const sub = submissions.find(s => s.assignmentId === a.id);
                    const grade = sub ? grades.find(g => g.submissionId === sub.id && g.isReleased) : null;
                    const pendingGrade = sub ? grades.find(g => g.submissionId === sub.id && !g.isReleased) : null;

                    let status = "Pending";
                    let gradeText = "-";
                    const weight = a.maxPoints ? `${a.maxPoints} pts` : "N/A";

                    if (grade) {
                        status = "Graded";
                        gradeText = `${Math.round((grade.pointsEarned / a.maxPoints) * 100)}%`;
                        totalPoints += a.maxPoints;
                        earnedPoints += grade.pointsEarned;
                    } else if (pendingGrade) {
                        status = "Pending Release";
                    } else if (sub) {
                        status = "Submitted";
                    } else if (new Date(a.dueDate) < new Date()) {
                        status = "Late";
                        gradeText = "0%";
                    }

                    return {
                        id: a.id,
                        name: a.title,
                        date: new Date(a.dueDate).toLocaleDateString(),
                        weight,
                        status,
                        grade: gradeText
                    };
                });

                if (mounted) {
                    setGradesData(mapped);
                    if (totalPoints > 0) {
                        setAvgGrade(`${((earnedPoints / totalPoints) * 100).toFixed(1)}%`);
                    } else {
                        setAvgGrade("-");
                    }
                }
            } catch (err) {
                console.error("Failed to load grades:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchGrades();
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    return (
        <motion.div className="flex-1 overflow-y-auto" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Grades</h1>
                <p className="text-gray-500 mt-2">{subject?.code || ""} | Academic Performance Overview</p>
            </motion.header>
            <motion.div variants={slideUp} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/50">
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Assignment Name</th>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Points</th>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                                        <td className="px-6 py-3.5">
                                            <div className="h-4 rounded-full bg-gray-200 mb-1.5" style={{ width: `${55 + (i * 19) % 40}%` }} />
                                            <div className="h-3 rounded-full bg-gray-100 w-20" />
                                        </td>
                                        <td className="px-6 py-3.5"><div className="h-4 rounded-full bg-gray-100 w-14" /></td>
                                        <td className="px-6 py-3.5"><div className="h-5 rounded-full bg-gray-100 w-20" /></td>
                                        <td className="px-6 py-3.5 text-right"><div className="h-4 rounded-full bg-gray-100 w-10 ml-auto" /></td>
                                    </tr>
                                ))}
                            </>
                        ) : gradesData.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-6 text-gray-500">No grades found.</td></tr>
                        ) : (
                            gradesData.map((item) => (
                                <motion.tr key={item.id} variants={slideUp} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-3.5">
                                        <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{item.date}</div>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-gray-600">{item.weight}</td>
                                    <td className="px-6 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${item.status === "Graded" ? "bg-green-50 text-green-600" : item.status === "Late" ? "bg-red-50 text-red-600" : item.status === "Pending Release" ? "bg-blue-50 text-blue-500" : "bg-orange-50 text-orange-600"}`}>{item.status}</span>
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="text-sm font-semibold text-gray-900">{item.grade}</span>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </motion.div>
            <motion.div variants={slideUp} className="mt-6 flex justify-end">
                <div className="bg-brand text-white px-6 py-4 rounded-3xl shadow-lg shadow-brand/25 flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Current Average</span>
                        <span className="text-2xl font-bold italic">{avgGrade}</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
