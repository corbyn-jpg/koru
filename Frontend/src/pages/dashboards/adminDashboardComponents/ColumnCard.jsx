import React from "react";
import { motion } from "framer-motion";

export function ColumnCard({ children, isSelected, onClick, className = "" }) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className={`w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 transition duration-200 cursor-pointer border
        ${isSelected
          ? "bg-brand text-white border-brand"
          : "bg-white/80 border-gray-200 hover:border-gray-200"
        } ${className}`}
    >
      {children}
    </motion.div>
  );
}
