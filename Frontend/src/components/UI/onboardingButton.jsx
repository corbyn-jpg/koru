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
      className="group flex aspect-square w-[180px] flex-col border-1 border-gray-200 items-center justify-center gap-3 rounded-3xl bg-brand/85 text-white shadow-xl backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:bg-white sm:w-[220px] md:w-[200px]"
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
      <span className="text-center text-sm font-semibold sm:text-base">
        {role}
      </span>
    </Link>
  );
}