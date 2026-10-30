import React from "react";
import { Search } from "lucide-react";

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full max-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none focus:border-brand/30 focus:bg-white transition-colors"
      />
    </div>
  );
}
