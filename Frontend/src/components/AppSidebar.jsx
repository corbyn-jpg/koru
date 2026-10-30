import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import KoruLogo from "./UI/KoruLogo";
import {
  Home,
  Book,
  Calendar,
  Stars,
  PieChart2,
  User,
  Settings,
  Eye,
} from "@solar-icons/react";
import { Menu as MenuIcon, X } from "lucide-react";
import { useCourses } from "../contexts/CoursesContext";
import { useAuth } from "../contexts/AuthContext";
import CourseManagerModal from "./courseManagerModal";

// ── Framer Motion Variants ──────────────────────────────────────────────────
const sidebarVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

const secondarySidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 32,
    },
  },
  exit: {
    x: -280,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 38,
    },
  },
};

const courseCardVariants = {
  hidden: { x: -10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

// ── Sidebar Nav Item ────────────────────────────────────────────────────────
function SidebarNavItem({
  label,
  href,
  icon,
  filledIcon,
  isActive,
  onClick,
  isButton = false,
  buttonRef,
}) {
  const content = (
    <>
      {isActive && (
        <motion.div
          layoutId="active-sidebar-pill"
          className="absolute inset-0 bg-brand rounded-[20px] -z-10 shadow-md shadow-brand/25"
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}
      <div className="flex items-center justify-center w-6 h-6 z-10 !text-inherit">
        {isActive && filledIcon ? filledIcon : icon}
      </div>
      <span className="text-[9px] font-bold leading-tight tracking-wide z-10 !text-inherit mt-1 select-none">{label}</span>
    </>
  );

  const baseClassName = `relative flex flex-col items-center justify-center w-full py-3.5 px-1.5 transition duration-200 group select-none cursor-pointer rounded-2xl
    ${isActive
      ? "!text-white"
      : "!text-gray-500 hover:!text-brand"
    }`;

  return (
    <motion.div variants={itemVariants} className="w-full px-2 relative">
      {isButton ? (
        <button
          ref={buttonRef}
          onClick={onClick}
          className={baseClassName}
          aria-label={label}
        >
          {content}
        </button>
      ) : (
        <Link
          to={href}
          onClick={onClick}
          className={baseClassName}
          aria-label={label}
        >
          {content}
        </Link>
      )}
    </motion.div>
  );
}

// ── Main AppSidebar Component ───────────────────────────────────────────────
export default function AppSidebar() {
  const location = useLocation();
  const { role } = useAuth();
  const { visibleCourses } = useCourses();
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCourseNav, setShowCourseNav] = useState(false);

  const sidebarRef = useRef(null);
  const coursesButtonRef = useRef(null);

  // Close courses sidebar on click-outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showCourseNav &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        coursesButtonRef.current &&
        !coursesButtonRef.current.contains(event.target)
      ) {
        setShowCourseNav(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCourseNav]);

  // Hide sidebar in iframe mode or on public routes
  const isIframeMode = window.self !== window.top;
  const hideNav = new URLSearchParams(location.search).get("hideNav") === "true";
  const publicRoutes = ["/", "/student/login", "/teacher/login", "/admin/login"];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  if (isIframeMode || hideNav || isPublicRoute) return null;

  // Primary navigation items
  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: <Home weight="Outline" size={22} color="currentColor" />,
      filledIcon: <Home weight="Bold" size={22} color="currentColor" />,
    },
    {
      label: "Courses",
      href: "/courses",
      icon: <Book weight="Outline" size={22} color="currentColor" />,
      filledIcon: <Book weight="Bold" size={22} color="currentColor" />,
    },
    {
      label: "Calendar",
      href: "/calendar",
      icon: <Calendar weight="Outline" size={22} color="currentColor" />,
      filledIcon: <Calendar weight="Bold" size={22} color="currentColor" />,
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: <PieChart2 weight="Outline" size={22} color="currentColor" />,
      filledIcon: <PieChart2 weight="Bold" size={22} color="currentColor" />,
    },
    {
      label: "Assistant",
      href: "/teacherassistant",
      icon: <Stars weight="Outline" size={22} color="currentColor" />,
      filledIcon: <Stars weight="Bold" size={22} color="currentColor" />,
    },
  ];

  // Utility items (bottom)
  const utilityItems = [
    ...(role === "admin"
      ? []
      : [
          {
            label: "Profile",
            href: "/profile",
            icon: <User weight="Outline" size={22} color="currentColor" />,
            filledIcon: <User weight="Bold" size={22} color="currentColor" />,
          },
        ]),
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings weight="Outline" size={22} color="currentColor" />,
      filledIcon: <Settings weight="Bold" size={22} color="currentColor" />,
    },
  ];

  const isActive = (href) =>
    href === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(href);

  const isActiveCourse = (courseId) => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const activeCourseId = pathParts.length > 1 ? pathParts[1] : null;
    return activeCourseId === courseId;
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <motion.aside
      className={`fixed z-50 flex flex-col items-center justify-between transition duration-300
        md:left-4 md:top-4 md:bottom-4 md:w-20 md:bg-white/85 md:border md:border-white/20 md:rounded-[32px] md:shadow-xl md:py-5
        max-md:left-0 max-md:top-0 max-md:h-screen max-md:w-[76px] max-md:bg-white/90 max-md:border-r max-md:border-gray-200/50 max-md:py-3
        ${mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"}
        max-md:shadow-2xl`}
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Logo ── */}
      <div className="pt-5 pb-3 flex items-center justify-center shrink-0">
        <Link to="/dashboard" className="group" aria-label="Home">
          <div className="w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <KoruLogo className="w-9 h-9" />
          </div>
        </Link>
      </div>

      {/* ── Primary Nav ── */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full pt-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <LayoutGroup>
          {navItems.map((item) => {
            const isCourses = item.label === "Courses";
            return (
              <SidebarNavItem
                key={item.label}
                {...item}
                isActive={isActive(item.href)}
                isButton={isCourses}
                buttonRef={isCourses ? coursesButtonRef : undefined}
                onClick={
                  isCourses
                    ? () => setShowCourseNav(!showCourseNav)
                    : () => {
                        setShowCourseNav(false);
                        closeMobile();
                      }
                }
              />
            );
          })}
        </LayoutGroup>
      </nav>

      {/* ── Divider ── */}
      <div className="w-10 h-px bg-gray-200/50 my-1.5 shrink-0" />

      {/* ── Utility Nav (Profile / Settings) ── */}
      <div className="py-2 flex flex-col items-center gap-1.5 w-full shrink-0">
        {utilityItems.map((item) => (
          <SidebarNavItem
            key={item.label}
            {...item}
            isActive={isActive(item.href)}
            onClick={() => {
              setShowCourseNav(false);
              closeMobile();
            }}
          />
        ))}
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        className="fixed top-4 left-4 z-[60] md:hidden w-10 h-10 rounded-2xl bg-white/80 border border-gray-200/50 shadow-lg flex items-center justify-center text-gray-600 hover:text-brand transition-colors"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Desktop: always visible | Mobile: conditionally visible ── */}
      <div className={`max-md:${mobileOpen ? "block" : "hidden"} md:block`}>
        {sidebarContent}
      </div>

      {/* ── Secondary Collapsible Course Sidebar ── */}
      <AnimatePresence>
        {showCourseNav && (
          <motion.div
            ref={sidebarRef}
            variants={secondarySidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed z-[55] flex flex-col pt-6 overflow-hidden transition duration-300
              md:left-[104px] md:top-4 md:bottom-4 md:w-72 md:bg-white md:border md:border-white/20 md:rounded-[28px] md:shadow-2xl
              max-md:left-[76px] max-md:top-0 max-md:h-screen max-md:w-72 max-md:bg-white max-md:border-r max-md:border-gray-200/50 max-md:shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 pb-4 border-b border-gray-200 flex flex-col gap-1">
              <h3 className="text-base font-extrabold tracking-tight !text-gray-900">
                My Courses
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Select a course to view details
              </p>
            </div>

            {/* Scrollable Course Cards List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 scrollbar-hide">
              {visibleCourses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400 font-medium">No courses enrolled</p>
                </div>
              ) : (
                visibleCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    variants={courseCardVariants}
                    className="w-full"
                  >
                    <Link
                      to={course.href}
                      onClick={() => {
                        setShowCourseNav(false);
                        closeMobile();
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition duration-200 group select-none
                        ${isActiveCourse(course.id)
                          ? "bg-brand/5 border-brand/20"
                          : "bg-transparent border-gray-200 hover:bg-gray-50/80 hover:border-gray-200"
                        }`}
                    >
                      {/* Dynamic Colored Badge */}
                      <div
                        style={{ backgroundColor: course.color }}
                        className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-200"
                      >
                        <span className="text-[10px] font-black tracking-wider leading-none uppercase">{course.code}</span>
                        <span className="text-[8px] font-black leading-none mt-0.5">{course.number}</span>
                      </div>

                      {/* Course info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold !text-gray-900 truncate group-hover:text-brand transition-colors">
                          {course.subjectName}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {course.description || `${course.code} ${course.number}`}
                        </p>
                      </div>

                      {/* Indicator dot */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors
                        ${isActiveCourse(course.id) ? "bg-brand" : "bg-transparent group-hover:bg-gray-300"}`}
                      />
                    </Link>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t border-gray-200 flex flex-col gap-2 bg-gray-50/50">
              <button
                onClick={() => {
                  setModalOpen(true);
                  setShowCourseNav(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 !text-gray-700 transition cursor-pointer shadow-xs"
              >
                <Eye size={16} />
                <span>Manage Courses</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Course Manager Modal ── */}
      <CourseManagerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
