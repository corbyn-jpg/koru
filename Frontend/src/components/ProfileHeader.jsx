import React from "react";
import { BadgeCheck, UserRound } from "lucide-react";

export default function ProfileHeader({ profile, roleLabel }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition-shadow duration-300">
      <div className="flex flex-wrap items-start gap-5">
        {profile.header.photoUrl ? (
          <img
            src={profile.header.photoUrl}
            alt="Profile"
            className="h-20 w-20 rounded-2xl border border-gray-200/60 object-cover shadow-3xs"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 text-brand border border-gray-200 shadow-3xs">
            <UserRound size={26} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{profile.header.fullName || "Name Not Set"}</h2>
          <p className="mt-1.5 text-sm font-extrabold text-brand tracking-tight">{profile.header.headline || "Headline Not Set"}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>{profile.header.major || "No Faculty"}</span>
            {profile.header.degree && (
              <>
                <span className="text-gray-300 select-none">•</span>
                <span>{profile.header.degree}</span>
              </>
            )}
            {profile.header.expectedGraduation && (
              <>
                <span className="text-gray-300 select-none">•</span>
                <span>Class of {profile.header.expectedGraduation}</span>
              </>
            )}
          </div>
          {profile.header.email ? (
            <p className="mt-2 text-xs font-bold text-gray-500">{profile.header.email}</p>
          ) : null}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-700 shadow-3xs">
          <BadgeCheck size={12} /> {roleLabel} Profile
        </span>
      </div>

      <p className="mt-5 text-sm font-medium leading-relaxed text-gray-600">{profile.header.summary || "No professional summary set."}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {profile.badges.map((badge, index) => (
          <span
            key={`badge-${index}`}
            className="rounded-full border border-purple-100 bg-purple-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand shadow-3xs"
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
