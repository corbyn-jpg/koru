import { notify, confirmAction } from "./UI/feedback";
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../contexts/CoursesContext";
import { updateCourseVisibility } from "../services/courseService";
import { courseService } from "../services/adminService";
import {
    Home,
    Megaphone,
    ClipboardList,
    Layers,
    Notebook,
    Award,
    CalendarCheck,
    FileText,
    Trash2,
    LayoutDashboard,
    Users,
    UsersRound,
    ScrollText,
} from "lucide-react";

const TEACHER_NAV_ITEMS = [
    { label: "Home", pathSuffix: "", end: true },
    { label: "Announcements", pathSuffix: "announcements" },
    { label: "Assignments", pathSuffix: "assignments" },
    { label: "Modules", pathSuffix: "modules" },
    { label: "Notes", pathSuffix: "notes" },
    { label: "Grades", pathSuffix: "grades" },
    { label: "Attendance", pathSuffix: "attendance" },
];

const ADMIN_NAV_ITEMS = [
    { label: "Overview", pathSuffix: "overview" },
    { label: "Students", pathSuffix: "students" },
    { label: "Groups & Classes", pathSuffix: "groups" },
    { label: "Assignments", pathSuffix: "assignments" },
    { label: "Grades", pathSuffix: "grades" },
    { label: "Grade Activity", pathSuffix: "grade-activity" },
];

const ICON_MAP = {
    Home: Home,
    Announcements: Megaphone,
    Assignments: ClipboardList,
    Modules: Layers,
    Notes: Notebook,
    Grades: Award,
    Attendance: CalendarCheck,
    Overview: LayoutDashboard,
    Students: Users,
    Groups: UsersRound,
    "Groups & Classes": UsersRound,
    Cohorts: UsersRound,
    "Grade Activity": ScrollText,
};

function getIcon(label) {
    const IconComponent = ICON_MAP[label] || FileText;
    return <IconComponent size={15} />;
}

export default function CourseSecondaryNav({ activeCourseId, hideNav, onDeleteCourse }) {
    const { role } = useAuth();
    const { visibleCourses, updateCourseVisibilityInContext } = useCourses();
    const isTeacher = role === "teacher";
    const isAdmin = role === "admin";

    const baseNavItems = isAdmin ? ADMIN_NAV_ITEMS : TEACHER_NAV_ITEMS;
    const [navItems, setNavItems] = useState(baseNavItems);
    const [isPublished, setIsPublished] = useState(true);
    const [deletingCourse, setDeletingCourse] = useState(false);

    // Fetch active course details
    const course = visibleCourses.find(c => c.id === activeCourseId) || visibleCourses[0] || null;

    useEffect(() => {
        setNavItems(isAdmin ? ADMIN_NAV_ITEMS : TEACHER_NAV_ITEMS);
    }, [isAdmin]);

    useEffect(() => {
        if (course) {
            setIsPublished(!!course.isVisible);
        }
    }, [course]);

    const togglePublished = async () => {
        if (!course) return;
        const newStatus = !isPublished;
        try {
            await updateCourseVisibility(course.id, newStatus);
            setIsPublished(newStatus);
            if (updateCourseVisibilityInContext) {
                updateCourseVisibilityInContext(course.id, newStatus);
            }
        } catch (error) {
            console.error("Failed to update course visibility:", error);
            notify("Error updating visibility: " + error.message);
        }
    };

    const handleDeleteCourse = async () => {
        if (!course) return;
        if (!await confirmAction(`Delete "${course.subjectName}"? This action cannot be undone.`)) return;
        setDeletingCourse(true);
        try {
            await courseService.deleteCourse(course.id);
            onDeleteCourse?.(course.id);
        } catch (err) {
            notify("Failed to delete course: " + err.message);
        } finally {
            setDeletingCourse(false);
        }
    };



    if (hideNav) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col shrink-0 transition duration-300
              md:h-full md:w-64 md:bg-white/85 md:border md:border-white/20 md:rounded-[28px] md:shadow-lg md:overflow-hidden
              max-md:h-full max-md:w-64 max-md:bg-white/80 max-md:border-r max-md:border-gray-200/50"
        >
            {/* Course Header Info */}
            {course && (
                <div className="px-6 pt-6 pb-5 border-b border-gray-200 shrink-0">
                    <h3 className="text-sm font-black text-gray-900 leading-tight">{course.subjectName}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{course.code} {course.number}</p>
                </div>
            )}

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto pt-4 pb-6 scrollbar-hide">
                <ul className="flex flex-col gap-0.5">
                    <AnimatePresence>
                        {navItems.map((item, index) => {
                            const toPath = item.pathSuffix
                                ? `/courses/${activeCourseId}/${item.pathSuffix}`
                                : `/courses/${activeCourseId}`;

                            return (
                                <motion.li
                                    key={item.label}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="list-none group relative"
                                >
                                    <NavLink
                                        to={toPath}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            `relative flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition duration-200 mx-3 my-0.5 rounded-xl group select-none cursor-pointer
                                            ${isActive
                                                ? "bg-brand/5 text-brand"
                                                : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeSecondaryLeftAccent"
                                                        className="absolute left-0 top-1/4 bottom-1/4 w-0.75 bg-brand rounded-r-md shrink-0"
                                                        transition={{
                                                            type: "spring",
                                                            stiffness: 300,
                                                            damping: 30
                                                        }}
                                                    />
                                                )}

                                                <span className={`transition-colors shrink-0 ${isActive ? "text-brand" : "text-gray-400 group-hover:text-gray-600"}`}>
                                                    {getIcon(item.label)}
                                                </span>

                                                <span className="flex-1 truncate !text-inherit">{item.label}</span>




                                            </>
                                        )}
                                    </NavLink>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            </div>

            {/* Teacher controls footer */}
            {isTeacher && (
                <div className="p-4 border-t border-gray-200 flex flex-col gap-3 bg-gray-50/50 shrink-0">
                    <div className="flex flex-col gap-1 px-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-none">
                            Course Controls
                        </span>

                        <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[10px] font-bold text-gray-500">Course Status</span>
                            <button
                                onClick={togglePublished}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-xs
                                    ${isPublished
                                        ? "bg-green-50 text-green-600 border border-green-200/50 hover:bg-green-100/50"
                                        : "bg-amber-50 text-amber-600 border border-amber-200/50 hover:bg-amber-100/50"
                                    }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                                <span>{isPublished ? "Published" : "Draft"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin controls footer */}
            {isAdmin && (
                <div className="p-4 border-t border-gray-200 bg-gray-50/50 shrink-0 space-y-2.5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-2 block">
                        Admin Controls
                    </span>

                    {/* Publish toggle */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-bold text-gray-500">Course Status</span>
                        <button
                            onClick={togglePublished}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-xs
                                ${isPublished
                                    ? "bg-green-50 text-green-600 border border-green-200/50 hover:bg-green-100/50"
                                    : "bg-amber-50 text-amber-600 border border-amber-200/50 hover:bg-amber-100/50"
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                            <span>{isPublished ? "Published" : "Draft"}</span>
                        </button>
                    </div>

                    {/* Delete course */}
                    <button
                        onClick={handleDeleteCourse}
                        disabled={deletingCourse}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition disabled:opacity-50 cursor-pointer"
                    >
                        <Trash2 size={12} />
                        {deletingCourse ? "Deleting…" : "Delete Course"}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
