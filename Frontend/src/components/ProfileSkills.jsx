import React from "react";
import { Sparkles } from "lucide-react";
import ChipListEditor from "./ChipListEditor";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";

export default function ProfileSkills({ skillGroups, editMode, updateProfile }) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="rounded-xl bg-brand/5 p-2 text-brand">
          <Sparkles size={20} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Skills Matrix</h2>
      </div>

      {editMode ? (
        <div className="grid gap-6 md:grid-cols-3">
          {skillGroups.map((group) => (
            <ChipListEditor
              key={group.key}
              title={group.label}
              items={group.items}
              onChange={(value) => updateProfile(`skills.${group.key}`, value)}
              placeholder={group.placeholder}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {skillGroups.map((group) => (
            <div
              key={group.key}
              className="rounded-[22px] border border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30 p-4 shadow-3xs hover:shadow-2xs transition duration-200"
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">{group.label}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {group.items.length > 0 ? (
                  group.items.map((item, index) => (
                    <span
                      key={`${group.key}-${index}`}
                      className="rounded-full border border-purple-100 bg-purple-50/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-brand shadow-3xs"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 font-medium italic">No skills listed.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
