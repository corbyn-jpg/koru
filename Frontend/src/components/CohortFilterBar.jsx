import { Users } from "lucide-react";

/**
 * Reusable cohort pill-tab filter bar.
 * Renders nothing when there are no cohorts (course not split into groups).
 */
export default function CohortFilterBar({ cohorts = [], selected, onChange }) {
  if (!cohorts || cohorts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1 shrink-0">
        <Users size={12} /> Group
      </span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
          selected === null
            ? "bg-brand text-white shadow-sm shadow-brand/20"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {cohorts.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
            selected === c.id
              ? "bg-brand text-white shadow-sm shadow-brand/20"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {c.name}
          {c.studentCount != null && (
            <span className="ml-1 opacity-60">· {c.studentCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
