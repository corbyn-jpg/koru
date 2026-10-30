import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const COLLAPSED_LIMIT = 3;

export default function CourseGlanceSelect({ activeCourseId, setActiveCourseId, visibleCourses }) {
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (visibleCourses?.length > 0 && !activeCourseId) {
            setActiveCourseId(visibleCourses[0].id);
        }
    }, [visibleCourses, activeCourseId, setActiveCourseId]);

    if (!visibleCourses || visibleCourses.length === 0) {
        return <div className="text-xs font-medium text-gray-400 pl-1">No active courses.</div>;
    }

    // Active course always first so it's never hidden inside the collapsed slice
    const orderedCourses = [
        visibleCourses.find((c) => c.id === activeCourseId),
        ...visibleCourses.filter((c) => c.id !== activeCourseId),
    ].filter(Boolean);

    const showExpander = orderedCourses.length > COLLAPSED_LIMIT;
    const displayedCourses = showExpander && !expanded
        ? orderedCourses.slice(0, COLLAPSED_LIMIT)
        : orderedCourses;

    return (
        <div className="relative w-full z-50 h-fit">
            <motion.div layout className="relative z-0 flex flex-row flex-wrap gap-2">
                {displayedCourses.map((course) => {
                    const isActive = activeCourseId === course.id;
                    return (
                        <motion.button
                            key={course.id}
                            layout="position"
                            initial={false}
                            animate={isActive ? { width: 116, height: 40 } : { width: 40, height: 40 }}
                            transition={{
                                layout: { type: "spring", stiffness: 240, damping: 30, mass: 0.9 },
                                width: { type: "spring", stiffness: 220, damping: 32, mass: 0.9, delay: isActive ? 0.14 : 0 },
                                height: { type: "spring", stiffness: 220, damping: 32, mass: 0.9 },
                            }}
                            className={`btn !rounded-full !border-transparent flex items-center overflow-hidden transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:shadow-sm hover:!border-transparent
                                ${isActive
                                    ? "!bg-purple-300 !text-black !pl-1 !pr-3 justify-start"
                                    : "!bg-purple-100 !text-purple-700 p-0 justify-center items-center hover:!bg-purple-200"
                                }`}
                            style={{
                                minWidth: 0, minHeight: 0,
                                padding: isActive ? undefined : 0,
                                display: "flex", alignItems: "center",
                                justifyContent: isActive ? "flex-start" : "center",
                            }}
                            onClick={() => setActiveCourseId(course.id)}
                        >
                            <span
                                className={`flex items-center w-full ${isActive ? "" : "justify-center"}`}
                                style={{ height: "100%" }}
                            >
                                {/*
                                  Circle: diameter=32px (radius=16). Left padding=4px so circle
                                  center sits at x=20 — matching the pill's left arc centre (radius=20
                                  for a 40px-tall rounded-full). Always white so the code is legible
                                  against both the active (purple-300) and inactive (purple-100) pill.
                                */}
                                <span className="flex-shrink-0 flex items-center justify-center" style={{ height: "100%" }}>
                                    <span className="w-8 h-8 rounded-full bg-white flex items-center font-bold justify-center aspect-square overflow-hidden transition-colors duration-150">
                                        <span className={`text-xs ${isActive ? "text-gray-800" : "text-purple-700"}`}>
                                            {course.code}
                                        </span>
                                    </span>
                                </span>

                                <motion.span
                                    initial={false}
                                    animate={{ opacity: isActive ? 1 : 0, width: isActive ? "auto" : 0 }}
                                    transition={{ duration: 0.2, delay: isActive ? 0.22 : 0 }}
                                    className="text-sm font-medium whitespace-nowrap pl-2 overflow-hidden"
                                    style={{ display: isActive ? "inline-block" : "none" }}
                                >
                                    {course.label}
                                </motion.span>
                            </span>
                        </motion.button>
                    );
                })}
            </motion.div>

            {showExpander && (
                <motion.button
                    layout
                    onClick={() => setExpanded((e) => !e)}
                    className="h-10 px-3 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-[width] duration-150 cursor-pointer focus:outline-none mt-2"
                >
                    {expanded ? "Less" : `+${orderedCourses.length - COLLAPSED_LIMIT} more`}
                </motion.button>
            )}
        </div>
    );
}
