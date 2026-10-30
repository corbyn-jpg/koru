import React from "react";
import { ChevronDown } from "lucide-react";

export function FilterDropdown({ label, value, options, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-full px-5 py-2.5 pr-10 text-sm font-semibold text-gray-700 cursor-pointer hover:border-gray-300 transition-colors outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label} {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
