import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * TeacherPerspectiveModal Component
 * 
 * Opens an iframe that loads the actual Teacher view URL.
 * This ensures the admin sees exactly what the live URL looks like
 * without the admin site's styling or logic interfering with the component.
 * 
 * @param {Object} course - The course object to preview
 * @param {Function} onClose - Function to close the modal
 */
export default function TeacherPerspectiveModal({ course, onClose }) {
  if (!course) return null;

  // We load the actual app route in an iframe.
  // This is the cleanest way to "import" the entire page experience 
  // exactly as it exists at that specific URL path, without importing 
  // the component directly into the Admin DOM.
  // We add ?viewAs=teacher to force the router to show the teacher view
  // and ?hideNav=true to hide menus inside the iframe.
  const previewUrl = `/courses/${course.id}?viewAs=teacher&hideNav=true`;

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
        <div className="px-8 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-black">
              {course.subject?.code?.[0] || "T"}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Teacher Perspective: <span className="text-brand">{course.subject?.name}</span>
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Viewing Live Page Experience • {previewUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-100 transition shadow-sm flex items-center gap-2"
              title="Close Preview"
            >
              <span className="text-[10px] font-black uppercase tracking-wider">Exit Preview</span>
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Iframe Content Area */}
        {/* Using an iframe to "import" the view ensures total isolation and 
            avoids any styling conflicts between the admin and teacher views. */}
        <div className="flex-1 bg-white relative">
          <iframe 
            src={previewUrl}
            className="w-full h-full border-none"
            title="Teacher Course Live Preview"
          />
          
          {/* Floating UI Indicator */}
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
