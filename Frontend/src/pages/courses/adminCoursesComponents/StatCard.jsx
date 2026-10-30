import React from "react";
import { motion } from "framer-motion";
import ProgressRing from "../../../components/UI/progressRing";

export default function StatCard({ label, value, icon: Icon, trend, accent = false }) {
  const isPercentage = typeof value === 'string' && value.endsWith('%');
  const numericValue = isPercentage ? parseInt(value.replace('%', '')) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-[24px] p-6 flex flex-col justify-between gap-4 transition-all hover:shadow-lg ${accent ? "bg-[#3C0078] text-white shadow-lg shadow-[#3C0078]/20" : "bg-white border border-gray-100 shadow-sm"}`}
    >
      <div className="flex justify-between items-start">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${accent ? "bg-white/10" : "bg-[#3C0078]/5"}`}>
          <Icon size={20} className={accent ? "text-white" : "text-[#3C0078]"} />
        </span>
        {trend && <div className={`text-[11px] font-black ${accent ? "text-white/60" : "text-[#3C0078]"}`}>{trend}</div>}
      </div>
      
      <div className="flex flex-col gap-1">
        {isPercentage ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 scale-50 -ml-4 -mr-4">
              <ProgressRing 
                percentage={numericValue} 
                size={80} 
                strokeWidth={10} 
              />
            </div>
            <div>
              <span className={`text-[11px] font-black uppercase tracking-[0.15em] block ${accent ? "text-white/50" : "text-gray-400"}`}>{label}</span>
              <span className={`text-2xl font-black ${accent ? "text-white" : "text-gray-900"}`}>{value}</span>
            </div>
          </div>
        ) : (
          <>
            <span className={`text-[11px] font-black uppercase tracking-[0.15em] block mb-1 ${accent ? "text-white/50" : "text-gray-400"}`}>{label}</span>
            <span className={`text-3xl font-black ${accent ? "text-white" : "text-gray-900"}`}>{value}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
