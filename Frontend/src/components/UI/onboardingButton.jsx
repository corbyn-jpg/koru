import React from "react";
import { Link } from "react-router-dom";

// Default routes – each role button navigates to its own login portal
const defaultRoutes = {
  student: "/student/login",
  teacher: "/teacher/login",
  admin: "/admin/login",
};

// Reusable onboarding button – displays a role card and links to the correct page
export default function OnboardingButton({ role, icon, to }) {
  // Resolve the destination based on the selected role
  const key = (role || "").toLowerCase();
  const destination = to || defaultRoutes[key] || "/";

  return (
    <Link
      to={destination}
      // White card so the black line-art icons and label stay readable; brand purple marks hover and focus
      className="group flex aspect-square w-[180px] flex-col items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand/50 hover:shadow-xl focus-visible:border-brand sm:w-[220px] md:w-[200px]"
    >
      {/* Icon container – keeps the role image centered inside the card */}
      <div className="flex h-25 w-25 items-center justify-center">
        <img
          src={icon}
          alt={`${role} icon`}
          className="h-15 w-15 object-contain sm:h-25 sm:w-25"
        />
      </div>

      {/* Role label – shown below the icon */}
      <span className="text-center text-sm font-semibold text-gray-900 transition-colors group-hover:text-brand group-focus-visible:text-brand sm:text-base">
        {role}
      </span>
    </Link>
  );
}