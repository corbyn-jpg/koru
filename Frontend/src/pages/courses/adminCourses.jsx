import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCourses } from "../../contexts/CoursesContext";
import CourseSecondaryNav from "../../components/courseSecondaryNav";
import { courseService } from "../../services/adminService";
import {
    AdminCourseOverviewView,
    AdminCourseStudentsView,
    AdminCohortsView,
    AdminGradeActivityView,
} from "./adminCoursesViews";
import {
    CourseAssignmentsView,
    CourseGradesView,
} from "./teacherCoursesComponents";

const SUBPAGES = ["overview", "students", "groups", "assignments", "grades", "grade-activity"];

export default function AdminCourses() {
    const location = useLocation();
    const navigate = useNavigate();
    const { visibleCourses, loading: ctxLoading } = useCourses();

    // Full course objects (with teacher, subject, capacity, etc.) for detail views
    const [fullCourses, setFullCourses] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(true);

    const loadFullCourses = useCallback(async () => {
        try {
            const data = await courseService.getAllCourses();
            setFullCourses(data || []);
        } catch {
            setFullCourses([]);
        } finally {
            setDetailsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFullCourses();
    }, [loadFullCourses]);

    // Parse path: /courses/:courseId/:subpage
    const pathParts = location.pathname.split("/").filter(Boolean);
    const activeCourseId = pathParts.length > 1 ? pathParts[1] : null;
    const activeSubpage = pathParts[2] || null;

    // Auto-redirect: to first course/overview once loaded
    useEffect(() => {
        if (ctxLoading || visibleCourses.length === 0) return;
        const courseExistsInList = visibleCourses.find(c => c.id === activeCourseId);
        if (!activeCourseId || !courseExistsInList) {
            navigate(`/courses/${visibleCourses[0].id}/overview`, { replace: true });
        } else if (!activeSubpage || !SUBPAGES.includes(activeSubpage)) {
            navigate(`/courses/${activeCourseId}/overview`, { replace: true });
        }
    }, [ctxLoading, visibleCourses, activeCourseId, activeSubpage, navigate]);

    // Full course object for the active course (for detail views)
    const activeCourse = fullCourses.find(c => c.id === activeCourseId) || null;

    // Context-mapped course for breadcrumb display
    const ctxCourse = visibleCourses.find(c => c.id === activeCourseId) || visibleCourses[0] || null;

    const subject = activeCourse
        ? {
            name: activeCourse.subject?.name,
            code: activeCourse.subject?.code,
            description: activeCourse.subject?.description,
          }
        : ctxCourse
        ? {
            name: ctxCourse.subjectName,
            code: ctxCourse.label,
            description: ctxCourse.description,
          }
        : null;

    const activeSubpageLabel = useMemo(() => {
        switch (activeSubpage) {
            case "overview": return "Overview";
            case "students": return "Students";
            case "groups": return "Groups & Classes";
            case "assignments": return "Assignments";
            case "grades": return "Grades";
            case "grade-activity": return "Grade Activity";
            default: return "Overview";
        }
    }, [activeSubpage]);

    const handleCourseDeleted = useCallback(() => {
        // After deletion, load courses and go to next available course
        loadFullCourses().then(() => {
            const remaining = visibleCourses.filter(c => c.id !== activeCourseId);
            if (remaining.length > 0) {
                navigate(`/courses/${remaining[0].id}/overview`, { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        });
    }, [activeCourseId, visibleCourses, navigate, loadFullCourses]);

    const handleOverviewSaved = useCallback(() => {
        loadFullCourses();
    }, [loadFullCourses]);

    return (
        <div className="flex overflow-hidden gap-4 transition-all duration-300 md:h-[calc(100vh-32px)] md:w-full max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 bg-transparent">
                <CourseSecondaryNav
                    activeCourseId={activeCourseId || visibleCourses[0]?.id}
                    onDeleteCourse={handleCourseDeleted}
                />

                <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:bg-white">
                    {/* Breadcrumb bar */}
                    {ctxCourse && (
                        <div className="h-14 border-b border-gray-100 bg-white/60 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0 select-none">
                            <div className="flex items-center gap-3">
                                <span
                                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm uppercase shrink-0"
                                    style={{ backgroundColor: ctxCourse.color || "#3C0078" }}
                                >
                                    {ctxCourse.code}{ctxCourse.number}
                                </span>
                                <span className="text-gray-300 text-xs">/</span>
                                <span className="text-xs font-bold text-gray-500 capitalize">{activeSubpageLabel}</span>
                            </div>
                        </div>
                    )}

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto pt-6 px-8 pb-12">
                        {ctxLoading || detailsLoading ? (
                            <div className="flex flex-col gap-5 animate-pulse">
                                <div className="h-8 rounded-2xl bg-gray-200 w-48" />
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-24 rounded-3xl bg-gray-100" />
                                    ))}
                                </div>
                                <div className="h-44 rounded-3xl bg-gray-100" />
                                <div className="h-36 rounded-3xl bg-gray-100" />
                            </div>
                        ) : activeSubpage === "overview" ? (
                            <AdminCourseOverviewView
                                course={activeCourse}
                                onSaved={handleOverviewSaved}
                            />
                        ) : activeSubpage === "students" ? (
                            <AdminCourseStudentsView courseId={activeCourseId} />
                        ) : activeSubpage === "groups" ? (
                            <AdminCohortsView courseId={activeCourseId} course={activeCourse} />
                        ) : activeSubpage === "assignments" ? (
                            <CourseAssignmentsView
                                subject={subject}
                                activeCourseId={activeCourseId}
                            />
                        ) : activeSubpage === "grades" ? (
                            <CourseGradesView
                                activeCourseId={activeCourseId}
                                subject={subject}
                            />
                        ) : activeSubpage === "grade-activity" ? (
                            <AdminGradeActivityView courseId={activeCourseId} />
                        ) : (
                            <AdminCourseOverviewView
                                course={activeCourse}
                                onSaved={handleOverviewSaved}
                            />
                        )}
                    </div>
                </div>
        </div>
    );
}
