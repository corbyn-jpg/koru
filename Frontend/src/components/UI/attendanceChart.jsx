import React from "react";
import { motion } from "framer-motion";

/**
 * AttendanceChart Component
 * 
 * A visually engaging, modern attendance tracker that uses a segmented ring 
 * to show attendance ratios and small floating indicators for stats.
 */
export default function AttendanceChart({ attended = 38, total = 42, missed = 4, centerLabel = "Attendance", leftStat = "Total", midStat = "Attended", rightStat = "Missed", leftValue, midValue, rightValue }) {
    const percentage = Math.round((attended / total) * 100);
    
    // SVG Circle Math
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center justify-center p-8 bg-white rounded-[40px] border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
            {/* Main Ring Chart */}
            <div className="relative w-64 h-64 flex items-center justify-center animate-in fade-in zoom-in duration-700">
                <svg className="w-full h-full -rotate-90 transform">
                    {/* Background Track */}
                    <circle
                        cx="128"
                        cy="128"
                        r={radius}
                        fill="transparent"
                        stroke="#F3F4F6"
                        strokeWidth="16"
                        className="opacity-50"
                    />
                    {/* Progress Fill */}
                    <motion.circle
                        cx="128"
                        cy="128"
                        r={radius}
                        fill="transparent"
                        stroke="#3C0078"
                        strokeWidth="16"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-6xl font-black italic tracking-tighter text-brand"
                    >
                        {percentage}%
                    </motion.span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-1">{centerLabel}</span>
                </div>
            </div>

            {/* Floating Stats Layout */}
            <div className="grid grid-cols-3 gap-8 w-full mt-8 border-t border-gray-100 pt-8">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{leftStat}</span>
                    <span className="text-xl font-bold text-gray-900">{leftValue ?? total}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky mb-1">{midStat}</span>
                    <span className="text-xl font-bold text-gray-900">{midValue ?? attended}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-ember mb-1">{rightStat}</span>
                    <span className="text-xl font-bold text-gray-900">{rightValue ?? missed}</span>
                </div>
            </div>

            {/* Micro-Interaction Indicator: "On Track" */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 right-8 flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 shadow-sm"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">On Track</span>
            </motion.div>
        </div>
    );
}
