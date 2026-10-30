import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdDelete } from "react-icons/md";

// Event modal – opens when you click an event or an empty slot
// Closes when you click outside the modal (the backdrop)
// mode: "create" or "edit"
export default function EventModal({ mode, event, onSave, onDelete, onClose }) {
  // Form state – pre-filled when editing, blank when creating
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.extendedProps?.description || "");
  const [eventType, setEventType] = useState(event?.extendedProps?.eventType || "");
  const [start, setStart] = useState(formatForInput(event?.start));
  const [end, setEnd] = useState(formatForInput(event?.end));
  const [bgColor, setBgColor] = useState(event?.backgroundColor || "#3C0078");
  const [courseId, setCourseId] = useState(event?.extendedProps?.courseId || "");

  const backdropRef = useRef(null);

  // Close when clicking the backdrop (outside the modal)
  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Submit the form – builds the event object and calls onSave
  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      id: event?.id || undefined,
      title,
      description,
      eventType,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      createdBy: event?.extendedProps?.createdBy || "",
      courseId,
      bgColor,
      textColor: "#ffffff",
    });
  }

  return (
    <AnimatePresence>
      {/* Backdrop – click to close */}
      <motion.div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        {/* Modal card */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand to-[#7B2FBE]" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <h3 className="text-lg font-semibold font-['Gabarito']">
              {mode === "create" ? "New Event" : "Edit Event"}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors bg-transparent border-none p-0"
              aria-label="Close"
            >
              <MdClose className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="e.g. DV300 – Theory"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                placeholder="Optional details…"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
              >
                <option value="">Select type…</option>
                <option value="Lecture">Lecture</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Workshop">Workshop</option>
                <option value="Assignment">Assignment Due</option>
                <option value="Exam">Exam</option>
                <option value="Meeting">Meeting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Start & End date/time side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>

            {/* Colour picker & Course ID side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Colour</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Course ID</label>
                <input
                  type="text"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="e.g. course-123"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              {/* Delete button – only visible in edit mode */}
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors bg-transparent border-none"
                >
                  <MdDelete className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div />
              )}

              {/* Save / Create button */}
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-brand hover:bg-[#2d005a] transition-colors border-none"
              >
                {mode === "create" ? "Create Event" : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Convert an ISO string or date string to "YYYY-MM-DDTHH:mm" for datetime-local inputs
function formatForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 16); // fallback
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
