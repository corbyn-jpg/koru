import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FilterDropdown({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-3.5 bg-white border border-gray-200 rounded-[20px] shadow-sm hover:border-brand/20 transition min-w-[170px]"
      >
        <div className="flex-1 text-left">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block leading-none mb-1">{label}</span>
          <span className="text-[13px] font-black text-gray-900 leading-none">{value}</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-[24px] shadow-2xl z-[110] overflow-hidden p-2"
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className={`w-full text-left px-5 py-3 rounded-[16px] text-[12px] font-black uppercase tracking-wider transition-colors ${value === opt ? "bg-brand text-white" : "text-gray-500 hover:bg-gray-50 hover:text-brand"}`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
