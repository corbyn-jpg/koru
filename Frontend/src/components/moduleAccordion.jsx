import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

/**
 * ModuleAccordion Component
 * 
 * A collapsible navigation list used in the Modules section.
 * Each section (Overview, Resources, Week 1, etc.) can be expanded to show sub-items.
 * Styled to match CourseSecondaryNav.
 */
function AccordionItem({ title, children, defaultOpen = false, onRemove, isTeacher }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="group">
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between py-2.5 px-4 text-left font-bold transition duration-200 rounded-xl mx-2 text-sm ${
            isOpen ? "text-brand" : "text-gray-500 hover:bg-purple-50"
          }`}
        >
          <span className="flex items-center gap-2">
            {title}
          </span>
          {isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
        </button>
        {isTeacher && (
          <button
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
            title="Remove Section"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="mt-1 mb-2">
          <ul className="flex flex-col gap-0.5">
            {children}
          </ul>
        </div>
      )}
    </div>
  );
}

function SubNavItem({ label, isActive, onClick, onRemove, isTeacher }) {
  return (
    <li
      className={`group flex items-center justify-between px-4 py-1.5 text-xs transition-colors mx-4 rounded-lg cursor-pointer ${
        isActive 
          ? "bg-brand text-white font-bold shadow-sm" 
          : "text-gray-500 hover:text-brand hover:bg-purple-100"
      }`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      {isTeacher && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`p-1 opacity-0 group-hover:opacity-100 transition ${
            isActive ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-red-500"
          }`}
          title="Remove Item"
        >
          <X size={12} />
        </button>
      )}
    </li>
  );
}

const MODULE_ACCORDION_KEY = "module_accordion_items";

const DEFAULT_ITEMS = [
  { id: 1, title: "Overview", subItems: ["Semester Overview"], defaultOpen: true },
  { id: 2, title: "Resources", subItems: ["Open Window Library", "Academic Rules", "Study Guide", "Prescribed Reading"], defaultOpen: true },
  { id: 3, title: "Week 1", subItems: ["Practical", "Theory"], defaultOpen: true },
  { id: 4, title: "Week 2", subItems: [], defaultOpen: false },
  { id: 5, title: "Week 3", subItems: [], defaultOpen: false },
  { id: 6, title: "Week 4", subItems: [], defaultOpen: false },
];

export default function ModuleAccordion() {
  const { role } = useAuth();
  const isTeacher = role === "teacher";
  const [activeItem, setActiveItem] = useState("Semester Overview");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSubItemTo, setAddingSubItemTo] = useState(null); 
  const [newSubItemLabel, setNewSubItemLabel] = useState("");

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(MODULE_ACCORDION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ITEMS;
  });

  useEffect(() => {
    localStorage.setItem(MODULE_ACCORDION_KEY, JSON.stringify(items));
  }, [items]);

  const removeSection = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const removeSubItem = (sectionId, subItemName) => {
    setItems(items.map(item => {
      if (item.id === sectionId) {
        return { ...item, subItems: item.subItems.filter(s => s !== subItemName) };
      }
      return item;
    }));
  };

  const addSection = () => {
    if (newSectionTitle.trim()) {
      setItems([...items, { id: Date.now(), title: newSectionTitle, subItems: [], defaultOpen: true }]);
      setNewSectionTitle("");
      setIsAddingSection(false);
    }
  };

  const addSubItem = (sectionId) => {
    if (newSubItemLabel.trim()) {
      setItems(items.map(item => {
        if (item.id === sectionId) {
          return { ...item, subItems: [...item.subItems, newSubItemLabel], defaultOpen: true };
        }
        return item;
      }));
      setNewSubItemLabel("");
      setAddingSubItemTo(null);
    }
  };

  return (
    <div className="flex flex-col gap-1 overflow-hidden bg-white/50 border border-1 border-gray-200 shadow-xl rounded-3xl min-w-[220px] max-h-[80vh] overflow-y-auto py-4 scrollbar-hide">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          title={item.title}
          defaultOpen={item.defaultOpen}
          isTeacher={isTeacher}
          onRemove={() => removeSection(item.id)}
        >
          {item.subItems.map((subItem) => (
            <SubNavItem
              key={subItem}
              label={subItem}
              isActive={activeItem === subItem}
              isTeacher={isTeacher}
              onClick={() => setActiveItem(subItem)}
              onRemove={() => removeSubItem(item.id, subItem)}
            />
          ))}
          {isTeacher && (
            <div className="px-4 py-1">
              {addingSubItemTo === item.id ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Item name..."
                    className="w-full bg-white/80 border border-black/10 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-black transition-colors"
                    value={newSubItemLabel}
                    onChange={(e) => setNewSubItemLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSubItem(item.id);
                      if (e.key === "Escape") setAddingSubItemTo(null);
                    }}
                  />
                  <div className="flex gap-1 mb-2">
                    <button
                      onClick={() => addSubItem(item.id)}
                      className="flex-1 py-1 bg-brand text-white text-[9px] font-bold uppercase tracking-wider rounded-md hover:bg-brand-deep transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingSubItemTo(null)}
                      className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSubItemTo(item.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-black/10 rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 hover:border-brand/30 hover:text-brand transition mb-1"
                >
                  <Plus size={10} /> Add Item
                </button>
              )}
            </div>
          )}
        </AccordionItem>
      ))}

      {isTeacher && (
        <div className="mt-4 px-4 border-t border-gray-200 pt-4">
          {isAddingSection ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Section name..."
                className="w-full bg-gray-50 border border-black/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-black transition-colors"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSection();
                  if (e.key === "Escape") setIsAddingSection(false);
                }}
              />
              <div className="flex gap-1">
                <button
                  onClick={addSection}
                  className="flex-1 py-1.5 bg-brand text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-brand-deep transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingSection(false)}
                  className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSection(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-black/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:border-black/30 hover:text-black transition"
            >
              <Plus size={14} /> Add Section
            </button>
          )}
        </div>
      )}
    </div>
  );
}