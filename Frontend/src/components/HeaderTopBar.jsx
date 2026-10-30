import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCourses } from "../contexts/CoursesContext";

export default function HeaderTopBar({ children }) {
  const location = useLocation();
  const { user: session, role } = useAuth();
  const { visibleCourses } = useCourses();
  
  const path = location.pathname;
  const pathParts = path.split("/").filter(Boolean);

  const navInfo = useMemo(() => {
    // Default fallback values
    let badgeText = "System";
    let badgeColor = "#3C0078";
    let titleText = "";
    let sectionText = "Overview";
    let showBadge = false;

    if (path.startsWith("/dashboard")) {
      badgeText = "Dashboard";
      titleText = role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Portal` : "University";
      sectionText = "Workspace Overview";
    } else if (path.startsWith("/calendar")) {
      badgeText = "Schedule";
      titleText = "Academic Calendar";
      sectionText = "Planner & Events";
    } else if (path.startsWith("/teacherassistant") || path.startsWith("/assistant")) {
      badgeText = "Co-Pilot";
      titleText = "AI Assistant";
      sectionText = "Teacher Assistant";
    } else if (path.startsWith("/analytics")) {
      badgeText = "Performance";
      titleText = "Learning Analytics";
      sectionText = "Progress Insights";
    } else if (path.startsWith("/settings")) {
      badgeText = "Preferences";
      titleText = "System Settings";
      sectionText = "Configuration";
    } else if (path.startsWith("/profile")) {
      badgeText = "Portfolio";
      titleText = "Student Profile";
      sectionText = "My Resume";
    } else if (path.startsWith("/courses")) {
      const activeCourseId = pathParts[1];
      const course = visibleCourses.find(c => c.id === activeCourseId) || visibleCourses[0] || null;
      if (course) {
        showBadge = true;
        badgeText = `${course.code} ${course.number}`;
        badgeColor = course.color;
        titleText = "";

        // Match specific course subpages
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart === "grades") sectionText = "Grades";
        else if (lastPart === "announcements") sectionText = "Announcements";
        else if (lastPart === "assignments") sectionText = "Assignments";
        else if (lastPart === "attendance") sectionText = "Attendance";
        else if (lastPart === "modules") sectionText = "Modules";
        else if (lastPart === "notes") sectionText = "Notes";
        else if (pathParts[2] === "assignments" && pathParts.length === 4) sectionText = "Assignment Details";
        else if (pathParts[2] === "items" && pathParts.length === 4) sectionText = "Module Page";
        else sectionText = "Home";
      } else {
        showBadge = false;
        titleText = "";
        sectionText = "Courses";
      }
    }
    
    return { badgeText, badgeColor, titleText, sectionText, showBadge };
  }, [path, pathParts, role, visibleCourses]);

  return (
    <div className="h-14 border-b border-gray-200 bg-white/80 flex items-center justify-between px-8 z-10 shrink-0 select-none">
      <div className="flex items-center gap-3">
        {navInfo.showBadge && (
          <span
            className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm uppercase shrink-0"
            style={{ backgroundColor: navInfo.badgeColor }}
          >
            {navInfo.badgeText}
          </span>
        )}
        {navInfo.titleText && (
          <h2 className="text-sm font-extrabold text-gray-900 truncate max-w-[200px] sm:max-w-xs">{navInfo.titleText}</h2>
        )}
        {navInfo.showBadge && <span className="text-gray-300 text-xs select-none">/</span>}
        <span className="text-xs font-bold text-gray-500 capitalize truncate">{navInfo.sectionText}</span>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
