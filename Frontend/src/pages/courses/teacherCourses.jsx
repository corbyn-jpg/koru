import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCourses } from "../../contexts/CoursesContext";
import CourseSecondaryNav from "../../components/courseSecondaryNav";
import CourseItemView from "./CourseItemView";
import {
    CourseAnnouncementsView,
    CourseAssignmentsView,
    CourseAttendanceView,
    CourseGradesView,
    CourseHomeView,
    CourseModulesView,
    CourseNotesView,
} from "./teacherCoursesComponents";

export default function TeacherCourses() {
    const location = useLocation();
    const navigate = useNavigate();
    const { visibleCourses, loading } = useCourses();

    const pathParts = location.pathname.split('/').filter(Boolean);
    const activeCourseId = pathParts.length > 1 ? pathParts[1] : null;

    useEffect(() => {
        if (!loading && visibleCourses.length > 0) {
            const courseExistsInList = visibleCourses.find(c => c.id === activeCourseId);
            if (!activeCourseId || !courseExistsInList) {
                navigate(`/courses/${visibleCourses[0].id}`, { replace: true });
            }
        }
    }, [loading, visibleCourses, activeCourseId, navigate, pathParts.length]);

    const course = visibleCourses.find(c => c.id === activeCourseId) || visibleCourses[0] || null;
    const subject = course ? {
        name: course.subjectName,
        code: course.label,
        description: course.description
    } : null;

    const path = location.pathname;

    const isGradesPage = path.endsWith("/grades");
    const isAnnouncementsPage = path.endsWith("/announcements");
    const isAssignmentsPage = path.endsWith("/assignments");
    const isAttendancePage = path.endsWith("/attendance");
    const isModulesPage = path.endsWith("/modules");
    const isNotesPage = path.endsWith("/notes");

    const isItemDetailPage = pathParts[2] === "items" && pathParts.length === 4;
    const activeItemId = isItemDetailPage ? pathParts[3] : null;

    const isHomePage = !isGradesPage && !isAnnouncementsPage && !isAssignmentsPage && !isAttendancePage && !isModulesPage && !isNotesPage && !isItemDetailPage;

    const activeSubpageLabel = React.useMemo(() => {
        if (isGradesPage) return "Grades";
        if (isAnnouncementsPage) return "Announcements";
        if (isAssignmentsPage) return "Assignments";
        if (isAttendancePage) return "Attendance";
        if (isModulesPage) return "Modules";
        if (isNotesPage) return "Notes";
        if (isItemDetailPage) return "Module Page";
        return "Home";
    }, [isGradesPage, isAnnouncementsPage, isAssignmentsPage, isAttendancePage, isModulesPage, isNotesPage, isItemDetailPage]);

    return (
        <div className="flex overflow-hidden gap-4 transition duration-300 md:h-[calc(100vh-32px)] md:w-full max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 bg-transparent">
            <CourseSecondaryNav activeCourseId={activeCourseId || (visibleCourses[0]?.id)} />

            <div className="flex-1 flex flex-col overflow-hidden transition duration-300 md:bg-white/85 md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:bg-white">
                {course && (
                    <div className="h-14 border-b border-gray-200 bg-white/80 flex items-center justify-between px-8 z-10 shrink-0 select-none">
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm uppercase shrink-0" style={{ backgroundColor: course.color }}>
                                {course.code}{course.number}
                            </span>
                            <span className="text-gray-300 text-xs">/</span>
                            <span className="text-xs font-bold text-gray-500 capitalize">{activeSubpageLabel}</span>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pt-6 px-8 pb-12">
                    {isItemDetailPage ? (
                        <CourseItemView activeCourseId={activeCourseId} activeItemId={activeItemId} isStudentView={false} />
                    ) : isGradesPage ? (
                        <CourseGradesView activeCourseId={activeCourseId} subject={subject} />
                    ) : isAnnouncementsPage ? (
                        <CourseAnnouncementsView activeCourseId={activeCourseId} />
                    ) : isAssignmentsPage ? (
                        <CourseAssignmentsView subject={subject} activeCourseId={activeCourseId} />
                    ) : isAttendancePage ? (
                        <CourseAttendanceView activeCourseId={activeCourseId} />
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
