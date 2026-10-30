import React from "react";
import { GraduationCap } from "lucide-react";
import ChipListEditor from "./ChipListEditor";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";
const INPUT_CLASS =
  "w-full text-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 text-gray-900";
const LABEL_CLASS =
  "text-gray-700 font-bold text-xs uppercase tracking-wider mb-1.5 block";

export default function ProfileEducation({ profile, editMode, updateProfile }) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
        <span className="rounded-xl bg-brand/5 p-2 text-brand">
          <GraduationCap size={20} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Education Context</h2>
      </div>

      {!editMode ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-extrabold tracking-tight text-gray-900">
            {profile.education.institution || "No institution set"}
          </p>
          {profile.education.gpa && (
            <p className="text-xs font-bold text-brand uppercase tracking-wider">
              GPA: <span className="text-sm font-extrabold text-gray-900 ml-1">{profile.education.gpa}</span>
            </p>
          )}

          <div className="mt-5 pt-4 border-t border-gray-200">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">Relevant Modules</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.education.modules && profile.education.modules.filter(Boolean).length > 0 ? (
                profile.education.modules.filter(Boolean).map((mod, index) => (
                  <span
                    key={`module-${index}`}
                    className="rounded-full border border-purple-100 bg-purple-50/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-brand shadow-3xs"
                  >
                    {mod}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 font-medium italic">No academic modules added yet.</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div>
              <label className={LABEL_CLASS}>Institution</label>
              <input
                value={profile.education.institution}
                onChange={(e) => updateProfile("education.institution", e.target.value)}
                placeholder="Institution name"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>GPA</label>
              <input
                value={profile.education.gpa}
                onChange={(e) => updateProfile("education.gpa", e.target.value)}
                placeholder="GPA (e.g. 3.9)"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-gray-200">
            <ChipListEditor
              title="Relevant Modules"
              items={profile.education.modules}
              onChange={(value) => updateProfile("education.modules", value)}
              placeholder="Academic modules supporting your profile"
            />
          </div>
        </div>
      )}
    </section>
  );
}
