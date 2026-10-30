import React from "react";
import { useAuth } from "../contexts/AuthContext";
import HeaderTopBar from "../components/HeaderTopBar";

// View components
import StudentDashboard from "./dashboards/studentDashboard";
import TeacherDashboard from "./dashboards/teacherDashboard";
import AdminDashboard from "./dashboards/adminDashboard";

// The unified Dashboard route - acts as a traffic controller based on user role
export default function Dashboard() {
  const { role } = useAuth();

  let content = <StudentDashboard />;
  if (role === "admin") {
    content = <AdminDashboard />;
  } else if (role === "teacher") {
    content = <TeacherDashboard />;
  }

  return (
    <div className="scroll-fade-bottom flex flex-col overflow-hidden transition duration-300 md:h-[calc(100vh-32px)] md:w-full md:bg-sunken md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 max-md:bg-white text-slate-900">
      {/* Reusable breadcrumb header top bar */}
      <HeaderTopBar />

      {/* Scrollable View Content area */}
      <div className="flex-1 overflow-y-auto pt-6 px-8 pb-12">
        <div className="w-full">
          {content}
        </div>
      </div>
    </div>
  );
}