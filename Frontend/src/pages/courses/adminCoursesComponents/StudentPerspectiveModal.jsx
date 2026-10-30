import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * StudentPerspectiveModal Component
 * 
 * Opens an iframe that loads the actual Student view URL.
 * This ensures the admin sees exactly what the live URL looks like
 * without the admin site's styling or logic interfering with the component.
 * 
 * @param {Object} course - The course object to preview
 * @param {Function} onClose - Function to close the modal
 */
export default function StudentPerspectiveModal({ course, onClose }) {
  if (!course) return null;

  // We load the actual app route in an iframe.
  // We add ?viewAs=student to force the router to show the student view
  // and ?hideNav=true to hide menus inside the iframe.
  const previewUrl = `/courses/${course.id}?viewAs=student&hideNav=true`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-[32px] w-[98vw] h-[95vh] shadow-2xl overflow-hidden flex flex-col relative border border-white/20" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-8 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-black">
              {course.subject?.code?.[0] || "S"}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Student Perspective: <span className="text-brand">{course.subject?.name}</span>
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Viewing Live Page Experience • {previewUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition shadow-sm flex items-center gap-2"
              title="Close Preview"
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Exit Preview</span>
              <X size={18}/>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white relative">
          <iframe 
            src={previewUrl}
            className="w-full h-full border-none"
            title="Student Course Live Preview"
          />
          
          <div className="absolute bottom-6 right-6 pointer-events-none z-[100]">
            <div className="px-4 py-2 rounded-full bg-brand text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-brand/20 border border-white/10">
              Live URL Preview
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
