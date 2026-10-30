import CourseGlanceDisplay from "./courseGlanceDisplay";
import TeacherCourseGlanceDisplay from "./teacherCourseGlanceDisplay";
import CourseGlanceSelect from "./UI/courseGlanceSelect";

import { motion } from "framer-motion";

import { useState } from "react";
import { useCourses } from "../contexts/CoursesContext";
import { useAuth } from "../contexts/AuthContext";

export default function CourseGlance() {
    const { visibleCourses } = useCourses();
    const [activeCourseId, setActiveCourseId] = useState(null);
    const { user } = useAuth();
    const isTeacher = user?.role === "teacher";

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 shadow-card rounded-3xl p-4">
            <div className="flex items-center justify-between mt-5 mb-1">
                <h2 className="text-2xl font-['Gabarito']">Course Glance</h2>
            </div>
            {/* Spacer between header and footer */}
            <div className="h-5" />
            <div>
                <CourseGlanceSelect activeCourseId={activeCourseId} setActiveCourseId={setActiveCourseId} visibleCourses={visibleCourses} />
                {isTeacher ? (
                    <TeacherCourseGlanceDisplay activeCourseId={activeCourseId} />
                ) : (
                    <CourseGlanceDisplay activeCourseId={activeCourseId} />
                )}
            </div>
        </div>
    );
}