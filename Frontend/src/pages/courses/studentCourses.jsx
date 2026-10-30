import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCourses } from "../../contexts/CoursesContext";
import CourseSecondaryNav from "../../components/courseSecondaryNav";
import AssignmentDetail from "./assignmentDetail";
import CourseItemView from "./CourseItemView";

import {
    CourseAnnouncementsView,
    CourseAssignmentsView,
    CourseAttendanceView,
    CourseGradesView,
    CourseHomeView,
    CourseModulesView,
    CourseNotesView,
} from "./studentCoursesComponents";

/**
 * Courses Page Component
 *
 * Supports two main views based on current path:
 * 1. Home (/courses)
 * 2. Modules (/courses/modules)
 */
export default function StudentCourses() {
    const location = useLocation();
    const navigate = useNavigate();
    const { visibleCourses, loading } = useCourses();
    
    // Check for hideNav in URL and persist it in memory for the duration of the component lifecycle
    const hideNav = useMemo(() => {
        return new URLSearchParams(location.search).get("hideNav") === "true";
    }, [location.search]);

    // The route matches /courses/:courseId/:subpage 
    // E.g. pathParts = ["courses", "dfg897-...", "grades"]
    const pathParts = location.pathname.split('/').filter(Boolean);
    const activeCourseId = pathParts.length > 1 ? pathParts[1] : null;

    // React Router Guard: If the user navigates merely to /courses without specifying an ID, 
    // we drop them smoothly into the first available course.
    useEffect(() => {
        if (!loading && visibleCourses.length > 0) {
            const courseExistsInList = visibleCourses.find(c => c.id === activeCourseId);
            if (!activeCourseId || !courseExistsInList) {
                const targetPath = `/courses/${visibleCourses[0].id}${hideNav ? '?hideNav=true' : ''}`;
                navigate(targetPath, { replace: true });
            }
        }
    }, [loading, visibleCourses, activeCourseId, navigate, hideNav]);

    // Build the resolved standard course object
    const course = visibleCourses.find(c => c.id === activeCourseId) || visibleCourses[0] || null;
    const subject = course ? {
        name: course.subjectName,
        code: course.label,
        description: course.description
    } : null;

    // Normalize sub-path checks based on the end of the URL
    const path = location.pathname;

    const isGradesPage = path.endsWith("/grades");
    const isAnnouncementsPage = path.endsWith("/announcements");
    const isAssignmentsPage = path.endsWith("/assignments");
    const isAttendancePage = path.endsWith("/attendance");
    const isModulesPage = path.endsWith("/modules");
    const isNotesPage = path.endsWith("/notes");

    // Home logic: If we are at /courses or /courses/:id NOT ending in a sub-path
    // Assignment detail: /courses/:courseId/assignments/:assignmentId
    const isAssignmentDetailPage = pathParts[2] === "assignments" && pathParts.length === 4;
    const activeAssignmentId = isAssignmentDetailPage ? pathParts[3] : null;

    // Module Item detail: /courses/:courseId/items/:itemId
    const isItemDetailPage = pathParts[2] === "items" && pathParts.length === 4;
    const activeItemId = isItemDetailPage ? pathParts[3] : null;


    // Determine active subpage label for the top breadcrumb bar
    const activeSubpageLabel = useMemo(() => {
        if (isGradesPage) return "Grades";
        if (isAnnouncementsPage) return "Announcements";
        if (isAssignmentsPage) return "Assignments";
        if (isAttendancePage) return "Attendance";
        if (isModulesPage) return "Modules";
        if (isNotesPage) return "Notes";
        if (isAssignmentDetailPage) return "Assignment Details";
        if (isItemDetailPage) return "Module Page";
        return "Home";
    }, [isGradesPage, isAnnouncementsPage, isAssignmentsPage, isAttendancePage, isModulesPage, isNotesPage, isAssignmentDetailPage, isItemDetailPage]);

    return (
        <div className="flex overflow-hidden gap-4 transition-all duration-300 md:h-[calc(100vh-32px)] md:w-full max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 bg-transparent">
            {/* Left Section: Floating Course Secondary Navigation */}
            <CourseSecondaryNav activeCourseId={activeCourseId || (visibleCourses[0]?.id)} hideNav={hideNav} />

            {/* Main Content Area: Floating Island Card */}
            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:bg-white">
                {/* Course Header Top Bar */}
                {course && (
                    <div className="h-14 border-b border-gray-100 bg-white/60 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0 select-none">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm uppercase shrink-0" style={{ backgroundColor: course.color }}>
                                {course.code}{course.number}
                            </span>
                            <span className="text-gray-300 text-xs">/</span>
                            <span className="text-xs font-bold text-gray-500 capitalize">{activeSubpageLabel}</span>
                        </div>
                    </div>
                )}

                {/* Scrollable View Content */}
                <div className="flex-1 overflow-y-auto pt-4 px-6 pb-8">
                    {isItemDetailPage ? (
                        <CourseItemView activeCourseId={activeCourseId} activeItemId={activeItemId} isStudentView={true} />
                    ) : isAssignmentDetailPage ? (
                        <AssignmentDetail assignmentId={activeAssignmentId} activeCourseId={activeCourseId} />
                    ) : isGradesPage ? (
                        <CourseGradesView subject={subject} activeCourseId={activeCourseId} />
                    ) : isAnnouncementsPage ? (
                        <CourseAnnouncementsView activeCourseId={activeCourseId} />
                    ) : isAssignmentsPage ? (
                        <CourseAssignmentsView subject={subject} activeCourseId={activeCourseId} />
                    ) : isAttendancePage ? (
                        <CourseAttendanceView activeCourseId={activeCourseId} subject={subject} />
                    ) : isModulesPage ? (
                        <CourseModulesView activeCourseId={activeCourseId} />
                    ) : isNotesPage ? (
                        <CourseNotesView activeCourseId={activeCourseId} />
                    ) : (
                        <CourseHomeView subject={subject} course={course} loading={loading} />
                    )}
                </div>
            </div>
        </div>
    );
}
