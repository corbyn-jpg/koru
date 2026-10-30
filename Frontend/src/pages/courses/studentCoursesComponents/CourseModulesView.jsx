import { notify } from "../../../components/UI/feedback";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronDown,
    ChevronRight,
    Paperclip,
    FileText,
    Link as LinkIcon,
    ExternalLink,
    Loader
} from "lucide-react";
import { getCourseModules, openModuleItemUrl } from "../../../services/moduleService";

export default function CourseModulesView({ activeCourseId }) {
  const navigate = useNavigate();
  const openItem = (item) => {
    if (!openModuleItemUrl(item)) notify("This item has no link or file attached yet.");
  };
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  useEffect(() => {
    if (!activeCourseId) return;
    let mounted = true;
    setModulesLoading(true);
    getCourseModules(activeCourseId)
      .then(data => {
        if (mounted) {
          // Filter out unpublished modules and items for the student view
          const visibleModules = (data ?? [])
            .filter(mod => mod.isPublished)
            .map(mod => ({
              ...mod,
              isOpen: mod.isOpen ?? true,
              items: (mod.items ?? []).filter(item => item.isPublished)
            }));
          setModules(visibleModules);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setModulesLoading(false);
      });
    return () => { mounted = false; };
  }, [activeCourseId]);

  const toggleModule = (id) => {
    setModules(modules.map(mod => mod.id === id ? { ...mod, isOpen: !mod.isOpen } : mod));
  };

  const areAllCollapsed = modules.every(mod => !mod.isOpen);

  const toggleAll = () => {
    const targetState = areAllCollapsed;
    setModules(modules.map(mod => ({ ...mod, isOpen: targetState })));
  };

  return (
    <div className="w-full flex flex-col gap-6 py-6 select-none">
      {/* Top action bar */}
      <div className="flex items-center justify-end gap-3 shrink-0">
        <button
          onClick={toggleAll}
          className="flex items-center justify-center px-4 py-2 text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition cursor-pointer shadow-xs"
        >
          {areAllCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      {/* Modules list */}
      <div className="flex flex-col gap-5">
        {modulesLoading ? (
          [3, 2, 4].map((itemCount, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden bg-white animate-pulse">
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/80 border-b border-gray-200">
                <div className="w-5 h-5 rounded-md bg-gray-200 shrink-0" />
                <div className="h-3 rounded-full bg-gray-200" style={{ width: `${90 + i * 45}px` }} />
              </div>
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: itemCount }, (_, j) => (
                  <div key={j} className="flex items-center gap-3 py-1">
                    <div className="w-4 h-4 rounded bg-gray-100 shrink-0" />
                    <div className="h-3 rounded-full bg-gray-100" style={{ width: `${110 + j * 55}px` }} />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : modules.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-8 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <FileText size={20} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold mb-1">No modules yet</p>
            <p className="text-xs text-gray-400">Course content will appear here once modules are published.</p>
          </div>
        ) : modules.map((mod) => (
          <div key={mod.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
            {/* Header row */}
            <div 
              onClick={() => toggleModule(mod.id)}
              className="flex items-center gap-3 px-5 py-4 bg-gray-50/80 border-b border-gray-200 cursor-pointer select-none group"
            >
              <span 
                className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0 p-1 hover:bg-gray-200 rounded-md"
              >
                {mod.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <div className="flex items-center gap-2">
                {mod.prefix && (
                  <span className="text-sm font-extrabold text-gray-700 shrink-0 select-none">
                    {mod.prefix}
                  </span>
                )}
                <h3 className="text-xs font-black tracking-wider text-gray-700 uppercase">
                  {mod.title}
                </h3>
              </div>
            </div>

            {/* Nested items & layout content */}
            {mod.isOpen && (
              <div className="flex flex-col">
                {mod.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 font-medium">
                    No items in this module section
                  </div>
                ) : (
                  mod.items.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between py-3.5 px-6 border-b border-gray-200 last:border-b-0 hover:bg-gray-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Icon based on type */}
                        <span className="text-gray-400 shrink-0">
                          {item.type === "attachment" && <Paperclip size={14} />}
                          {item.type === "document" && <FileText size={14} />}
                          {item.type === "link" && <LinkIcon size={14} />}
                        </span>

                        {/* Title link or standard text */}
                        {item.type === "link" ? (
                          <a 
                            href="#"
                            onClick={(e) => { e.preventDefault(); openItem(item); }}
                            className="text-xs font-bold !text-blue-600 hover:underline flex items-center gap-1.5 min-w-0"
                          >
                            <span className="truncate">{item.label}</span>
                            {item.isExternal && <ExternalLink size={11} className="shrink-0" />}
                          </a>
                        ) : item.type === "document" ? (
                          <span 
                            className="text-xs font-bold text-gray-700 hover:text-brand hover:underline truncate cursor-pointer"
                            onClick={() => navigate(`/courses/${activeCourseId}/items/${item.id}${window.location.search}`)}
                          >
                            {item.label}
                          </span>
                        ) : (
                          <span 
                            className="text-xs font-bold text-gray-700 truncate cursor-pointer hover:text-gray-900"
                            onClick={() => openItem(item)}
                          >
                            {item.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
