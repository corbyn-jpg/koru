import React from "react";
import { Briefcase } from "lucide-react";
import ChipListEditor from "./ChipListEditor";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";

export default function ProfileExperience({ experienceGroups, editMode, updateProfile }) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="rounded-xl bg-brand/5 p-2 text-brand">
          <Briefcase size={20} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Academic &amp; Practical Experience</h2>
      </div>

      {!editMode ? (
        <div className="grid gap-6 md:grid-cols-2">
          {experienceGroups.map((group) => (
            <div
              key={group.key}
              className="rounded-[22px] border border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30 p-5 shadow-3xs hover:shadow-2xs transition duration-200"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">{group.label}</p>
              <ul className="space-y-3">
                {group.items && group.items.filter(Boolean).length > 0 ? (
                  group.items.filter(Boolean).map((item, index) => (
                    <li key={`${group.key}-${index}`} className="flex items-start gap-2.5 text-sm font-medium text-gray-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-gray-400 font-medium italic">No entries added yet.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {experienceGroups.map((group) => (
            <div key={group.key} className="rounded-[22px] border border-gray-100 bg-gray-50/20 p-5 shadow-3xs">
              <ChipListEditor
                title={group.label}
                items={group.items}
                onChange={(value) => updateProfile(`experience.${group.key}`, value)}
                placeholder={group.placeholder}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
