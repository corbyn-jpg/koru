import { notify } from "../../../components/UI/feedback";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Bell, Calendar, Clock } from "lucide-react";
import { SearchInput } from "./SearchInput";

export function SendNotificationModal({ lecturers, onClose, onSend }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const filteredLecturers = lecturers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleLecturer = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (!title || !startTime || !endTime || selectedIds.length === 0) {
      notify("Please fill in all fields and select at least one lecturer.");
      return;
    }
    onSend({
      title,
      description,
      startTime,
      endTime,
      selectedIds,
      eventType: "Meeting",
      bgColor: "#3C0078",
      textColor: "#ffffff"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand/5 to-transparent">
          <div>
            <h3 className="text-2xl font-bold font-['Gabarito'] text-gray-900">Send Notification</h3>
            <p className="text-sm text-gray-500 mt-1">Schedule a meeting or send a notice to lecturers' calendars.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8">
          {/* Left: Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Subject / Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Faculty Meeting"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-brand outline-none transition text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Start Date & Time</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input
                     type="datetime-local"
                     value={startTime}
                     onChange={(e) => setStartTime(e.target.value)}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-brand outline-none transition text-sm font-semibold"
                   />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">End Date & Time</label>
                <div className="relative">
                   <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input
                     type="datetime-local"
                     value={endTime}
                     onChange={(e) => setEndTime(e.target.value)}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-brand outline-none transition text-sm font-semibold"
                   />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Message (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the meeting..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-brand outline-none transition text-sm font-semibold resize-none"
              />
            </div>
          </div>

          {/* Right: Lecturer Selection */}
          <div className="flex flex-col min-h-0">
             <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Select Lecturers ({selectedIds.length})</label>
             <div className="mb-4">
               <SearchInput value={search} onChange={setSearch} placeholder="Search names..." />
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <button 
                  onClick={() => {
                    if (selectedIds.length === lecturers.length) setSelectedIds([]);
                    else setSelectedIds(lecturers.map(l => l.id));
                  }}
                  className="text-[10px] font-bold text-brand uppercase mb-1 hover:underline ml-1"
                >
                  {selectedIds.length === lecturers.length ? "Deselect All" : "Select All"}
                </button>
                {filteredLecturers.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleLecturer(l.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${
                      selectedIds.includes(l.id)
                        ? "bg-brand/5 border-brand shadow-sm"
                        : "bg-white border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      selectedIds.includes(l.id) ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      <User className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-bold ${selectedIds.includes(l.id) ? "text-brand" : "text-gray-700"}`}>
                      {l.name}
                    </span>
                    {selectedIds.includes(l.id) && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
           <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
           >
             Cancel
           </button>
           <button
             onClick={handleSend}
             className="px-8 py-3 rounded-2xl bg-brand text-white font-bold flex items-center gap-2 shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition"
           >
             <Bell className="w-4 h-4" />
             Send Notification
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
}