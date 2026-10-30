import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Sparkles, Mic, Send, ChevronDown,
  Calendar, BookOpen, FileEdit, BarChart,
  FileText, Lightbulb, ClipboardList,
} from "lucide-react";

// ─── Role-specific tool definitions ──────────────────────────────────────────

const TOOLS = {
  teacher: [
    {
      icon: Calendar,
      label: "Generate Timetable",
      desc: "Create a structured weekly schedule",
      template: "Generate a structured weekly timetable for a [Subject] course. Include lectures, lab hours, student office hours, and self-study sessions.",
    },
    {
      icon: BookOpen,
      label: "Plan a Module",
      desc: "Draft a lesson or module plan",
      template: "Draft a detailed lesson plan and module outline for [Topic/Subject]. Include learning objectives, a weekly breakdown, and recommended reading resources.",
    },
    {
      icon: FileEdit,
      label: "Draft Feedback",
      desc: "Write constructive student feedback",
      template: "Write constructive and encouraging feedback for a student named [Name] who [scored 78% / struggled with time management] on the [Assignment Name] assignment.",
    },
    {
      icon: BarChart,
      label: "Analyse Class Data",
      desc: "Interpret performance analytics",
      template: "Help me interpret my class analytics. The class average is [80]% but the assignment submission rate is only [65]%. What insights can I draw from this?",
    },
  ],
  student: [
    {
      icon: Lightbulb,
      label: "Explain a Concept",
      desc: "Break down a topic simply",
      template: "Explain [Concept] in simple terms with a practical example I can relate to.",
    },
    {
      icon: ClipboardList,
      label: "Practice Questions",
      desc: "Generate exam prep questions",
      template: "Generate 5 practice questions for [Topic] with model answers to help me prepare for my assessment.",
    },
    {
      icon: FileText,
      label: "Summarise Notes",
      desc: "Condense topic notes",
      template: "Please summarise the key points from [Topic] in a clear and concise format, highlighting the most important concepts.",
    },
    {
      icon: BarChart,
      label: "Grade Summary",
      desc: "Review my academic performance",
      template: "Give me a summary of how I am performing across all my current courses, and highlight anything I should focus on.",
    },
  ],
  admin: [
    {
      icon: BarChart,
      label: "Platform Report",
      desc: "Overall performance overview",
      template: "Generate a comprehensive report on the platform's current academic performance across all courses and cohorts.",
    },
    {
      icon: FileText,
      label: "At-Risk Analysis",
      desc: "Identify struggling students",
      template: "Analyse the current data and identify students who may be at risk based on their grades and attendance records.",
    },
    {
      icon: Calendar,
      label: "Attendance Overview",
      desc: "Session attendance statistics",
      template: "Give me an overview of attendance patterns across all current courses and flag any concerning trends.",
    },
    {
      icon: FileEdit,
      label: "Grade Summary",
      desc: "Grade distribution report",
      template: "Summarise the grade distribution across all active courses and highlight any subjects with below-average performance.",
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssistantInput({ onSend, disabled = false, role = "teacher" }) {
  const [isToolsOpen, setIsToolsOpen]  = useState(false);
  const [prompt, setPrompt]            = useState("");
  const dropdownRef                    = useRef(null);
  const textareaRef                    = useRef(null);

  const tools = TOOLS[role] || TOOLS.teacher;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (prompt.trim() && onSend && !disabled) {
      onSend(prompt.trim());
      setPrompt("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleToolClick = (template) => {
    setPrompt(template);
    setIsToolsOpen(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`relative w-full bg-white/85 backdrop-blur-xl border shadow-lg rounded-2xl p-3 flex flex-col transition duration-200 ${
          disabled
            ? "opacity-70 border-gray-200/40"
            : "border-white/70 focus-within:shadow-brand/10 focus-within:ring-2 focus-within:ring-brand/15"
        }`}
      >
        {/* Textarea */}
        <div className="flex items-start gap-3 px-2 pt-1 pb-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={disabled ? "Koru is thinking…" : "Ask Koru anything…"}
            disabled={disabled}
            className="w-full bg-transparent resize-none outline-none text-slate-800 placeholder:text-gray-400 min-h-[44px] max-h-[180px] text-[15px] font-medium leading-relaxed disabled:cursor-not-allowed"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
          />
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100/80">

          {/* Left: attachment + tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-40 cursor-pointer"
              aria-label="Attach file"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>

            {/* Tools dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setIsToolsOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 cursor-pointer ${
                  isToolsOpen
                    ? "bg-brand/8 text-brand"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Tools
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isToolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute bottom-full left-0 mb-2 w-68 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1.5"
                    style={{ width: "272px" }}
                  >
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Quick templates
                    </p>
                    {tools.map((tool, idx) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToolClick(tool.template)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors w-full cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 leading-snug">{tool.label}</p>
                            <p className="text-xs text-gray-400">{tool.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: mic + send */}
          <div className="flex items-center gap-1.5 pr-1">
            <button
              type="button"
              disabled={disabled}
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-40 cursor-pointer"
              aria-label="Voice input"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>

            <AnimatePresence>
              {prompt.trim().length > 0 && !disabled && (
                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-md shadow-brand/20 text-white cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-center text-[10px] text-gray-400/70 mt-2 select-none">
        Koru can make mistakes. Use your judgement for important decisions.
      </p>
    </div>
  );
}
