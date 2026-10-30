import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Link2 } from "lucide-react";

// ──────────────────────────────────────────────
// Teacher shortcut chips – quick links to tools / pages
// Data is stored locally for now; easy to swap with a backend later.
// ──────────────────────────────────────────────
const defaultShortcuts = [
  { id: 1, label: "Class 1 Grades", url: "#" },
  { id: 2, label: "Miro", url: "#" },
  { id: 3, label: "Assignment 1", url: "#" },
  { id: 4, label: "Figma", url: "#" },
  { id: 5, label: "Google Slides", url: "#" },
];

const chipVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

export default function TeacherShortcuts() {
  const [shortcuts, setShortcuts] = useState(defaultShortcuts);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function handleAdd() {
    if (!newLabel.trim()) return;
    setShortcuts((prev) => [
      ...prev,
      { id: Date.now(), label: newLabel.trim(), url: newUrl.trim() || "#" },
    ]);
    setNewLabel("");
    setNewUrl("");
    setIsAdding(false);
  }

  function handleRemove(id) {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="w-full h-full flex flex-col bg-white/80 border-1 border-gray-200 rounded-3xl drop-shadow-xl p-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mt-5 mb-1">
        <h2 className="text-2xl font-['Gabarito']">Shortcuts</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Add shortcut"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-5 font-medium">Quick access links</p>

      {/* ── Add shortcut form ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Rubric)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="URL (optional)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-brand rounded-lg hover:bg-brand-deep transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chip Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-black pr-1">
        <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {shortcuts.map((shortcut, i) => (
            <motion.a
              key={shortcut.id}
              href={shortcut.url}
              custom={i}
              variants={chipVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-brand/30 hover:shadow-md hover:bg-brand/[0.03] transition duration-300 cursor-pointer"
            >
              {shortcut.label}
              {/* Remove button – appears on hover */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(shortcut.id);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-400 hover:text-white text-gray-500 items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition duration-200 hidden group-hover:flex"
                aria-label={`Remove ${shortcut.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.a>
          ))}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
