import { notify } from "../../../components/UI/feedback";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "@solar-icons/react";
import { Plus, ChevronDown, ChevronRight, Loader, X, Paperclip, FileText, ExternalLink, Link as LinkIcon, EyeOff, MoreVertical, Copy, Pencil, Trash2 } from "lucide-react";
import { getCourseModules, createModule, updateModule, deleteModule, createModuleItem, updateModuleItem, deleteModuleItem, openModuleItemUrl } from "../../../services/moduleService";
import { uploadFileToCloudinary } from "../../../services/cloudinaryService";

export function CourseModulesView({ activeCourseId }) {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  useEffect(() => {
    if (!activeCourseId) return;
    let mounted = true;
    setModulesLoading(true);
    getCourseModules(activeCourseId)
      .then(data => { if (mounted) setModules(data); })
      .catch(console.error)
      .finally(() => { if (mounted) setModulesLoading(false); });
    return () => { mounted = false; };
  }, [activeCourseId]);

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [createModuleError, setCreateModuleError] = useState("");

  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  const [addingItemTo, setAddingItemTo] = useState(null);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemType, setNewItemType] = useState("document");
  const [isNewItemExternal, setIsNewItemExternal] = useState(true);
  const [newItemUrl, setNewItemUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemModuleId, setEditingItemModuleId] = useState(null);
  const [editingItemLabel, setEditingItemLabel] = useState("");

  // openMenu: null | { type: 'module'|'item', id, modId?, top, right }
  const [openMenu, setOpenMenu] = useState(null);
  // deleteConfirm: null | { type: 'module', modId } | { type: 'item', modId, itemId }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  function openModuleMenu(e, modId) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu(prev =>
      prev?.type === "module" && prev.id === modId ? null : {
        type: "module",
        id: modId,
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      }
    );
  }

  function openItemMenu(e, modId, itemId) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu(prev =>
      prev?.type === "item" && prev.id === itemId ? null : {
        type: "item",
        id: itemId,
        modId,
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      }
    );
  }

  const toggleModule = (id) => {
    setModules(modules.map(mod => mod.id === id ? { ...mod, isOpen: !mod.isOpen } : mod));
  };

  const areAllCollapsed = modules.every(mod => !mod.isOpen);

  const toggleAll = () => {
    const targetState = areAllCollapsed;
    setModules(modules.map(mod => ({ ...mod, isOpen: targetState })));
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !activeCourseId) return;
    setIsCreatingModule(true);
    setCreateModuleError("");
    try {
      const created = await createModule({ courseId: activeCourseId, title: newModuleTitle, isPublished: true, isOpen: true });
      setModules(prev => [...prev, { ...created, items: created.items ?? [] }]);
      setNewModuleTitle("");
      setIsAddingModule(false);
    } catch (err) {
      console.error("Failed to create module:", err);
      setCreateModuleError(err.message || "Failed to create module. Please try again.");
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleRenameModule = async (modId) => {
    if (!editingModuleTitle.trim()) return;
    const mod = modules.find(m => m.id === modId);
    if (!mod) return;
    setModules(prev => prev.map(m => m.id === modId ? { ...m, title: editingModuleTitle } : m));
    setEditingModuleId(null);
    setEditingModuleTitle("");
    try {
      await updateModule(modId, { ...mod, title: editingModuleTitle });
    } catch (err) {
      console.error("Failed to rename module:", err);
      setModules(prev => prev.map(m => m.id === modId ? { ...m, title: mod.title } : m));
    }
  };

  const handleDeleteModule = async (modId) => {
    setModules(prev => prev.filter(m => m.id !== modId));
    setDeleteConfirm(null);
    try {
      await deleteModule(modId);
    } catch (err) {
      console.error("Failed to delete module:", err);
      getCourseModules(activeCourseId).then(setModules).catch(console.error);
    }
  };

  const handleDuplicateModule = async (modId) => {
    const mod = modules.find(m => m.id === modId);
    if (!mod || !activeCourseId) return;
    try {
      const created = await createModule({
        courseId: activeCourseId,
        title: `${mod.title} (Copy)`,
        isPublished: false,
        isOpen: true,
      });
      const newMod = { ...created, items: [] };
      for (const item of (mod.items ?? [])) {
        const createdItem = await createModuleItem({
          moduleId: created.id,
          label: item.label,
          type: item.type,
          isPublished: false,
          isExternal: item.isExternal ?? false,
        });
        newMod.items.push(createdItem);
      }
      setModules(prev => [...prev, newMod]);
    } catch (err) {
      console.error("Failed to duplicate module:", err);
    }
  };

  const handleToggleModulePublish = async (modId, e) => {
    e.stopPropagation();
    const mod = modules.find(m => m.id === modId);
    if (!mod) return;
    const next = !mod.isPublished;
    setModules(prev => prev.map(m => m.id === modId ? { ...m, isPublished: next } : m));
    try {
      await updateModule(modId, { ...mod, isPublished: next });
    } catch (err) {
      console.error("Failed to update module publish state:", err);
      setModules(prev => prev.map(m => m.id === modId ? { ...m, isPublished: mod.isPublished } : m));
    }
  };

  const handleAddItem = async (modId) => {
    if (!newItemLabel.trim()) return;
    if (newItemType !== "document" && !/^https?:\/\//i.test(newItemUrl.trim())) {
      notify(newItemType === "link" ? "Add the link address, starting with https://" : "Choose a file to upload first.");
      return;
    }
    try {
      const created = await createModuleItem({
        moduleId: modId,
        label: newItemLabel,
        type: newItemType,
        isPublished: true,
        isExternal: newItemType === "link" ? isNewItemExternal : false,
        content: newItemType === "document" ? null : newItemUrl.trim(),
      });
      setModules(prev => prev.map(mod => {
        if (mod.id === modId) return { ...mod, items: [...(mod.items ?? []), created] };
        return mod;
      }));
      setNewItemLabel("");
      setNewItemUrl("");
      setAddingItemTo(null);
      if (created.type === "document") navigate(`/courses/${activeCourseId}/items/${created.id}`);
    } catch (err) {
      notify("Couldn't add the item: " + err.message);
    }
  };

  const handleAttachmentPick = async (file) => {
    if (!file) return;
    setUploadingAttachment(true);
    try {
      setNewItemUrl(await uploadFileToCloudinary(file));
      if (!newItemLabel.trim()) setNewItemLabel(file.name);
    } catch (err) {
      notify("Upload failed: " + err.message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const openItem = (item) => {
    if (!openModuleItemUrl(item)) notify("This item has no link or file attached yet.");
  };

  const handleRenameItem = async (modId, itemId) => {
    if (!editingItemLabel.trim()) return;
    const mod = modules.find(m => m.id === modId);
    const item = mod?.items?.find(i => i.id === itemId);
    if (!item) return;
    setModules(prev => prev.map(m => {
      if (m.id === modId) return { ...m, items: m.items.map(i => i.id === itemId ? { ...i, label: editingItemLabel } : i) };
      return m;
    }));
    setEditingItemId(null);
    setEditingItemModuleId(null);
    setEditingItemLabel("");
    try {
      await updateModuleItem(itemId, { ...item, label: editingItemLabel });
    } catch (err) {
      console.error("Failed to rename item:", err);
      setModules(prev => prev.map(m => {
        if (m.id === modId) return { ...m, items: m.items.map(i => i.id === itemId ? { ...i, label: item.label } : i) };
        return m;
      }));
    }
  };

  const handleDeleteItem = async (modId, itemId) => {
    setModules(prev => prev.map(m => {
      if (m.id === modId) return { ...m, items: m.items.filter(i => i.id !== itemId) };
      return m;
    }));
    setDeleteConfirm(null);
    try {
      await deleteModuleItem(itemId);
    } catch (err) {
      console.error("Failed to delete item:", err);
      getCourseModules(activeCourseId).then(setModules).catch(console.error);
    }
  };

  const handleDuplicateItem = async (modId, itemId) => {
    const mod = modules.find(m => m.id === modId);
    const item = mod?.items?.find(i => i.id === itemId);
    if (!item) return;
    try {
      const created = await createModuleItem({
        moduleId: modId,
        label: `${item.label} (Copy)`,
        type: item.type,
        isPublished: false,
        isExternal: item.isExternal ?? false,
      });
      setModules(prev => prev.map(m => {
        if (m.id === modId) return { ...m, items: [...m.items, created] };
        return m;
      }));
    } catch (err) {
      console.error("Failed to duplicate item:", err);
    }
  };

  const handleToggleItemPublish = async (modId, itemId) => {
    const mod = modules.find(m => m.id === modId);
    const item = mod?.items?.find(i => i.id === itemId);
    if (!item) return;
    const next = !item.isPublished;
    setModules(prev => prev.map(m => {
      if (m.id === modId) return { ...m, items: m.items.map(i => i.id === itemId ? { ...i, isPublished: next } : i) };
      return m;
    }));
    try {
      await updateModuleItem(itemId, { ...item, isPublished: next });
    } catch (err) {
      console.error("Failed to toggle item publish:", err);
      setModules(prev => prev.map(m => {
        if (m.id === modId) return { ...m, items: m.items.map(i => i.id === itemId ? { ...i, isPublished: item.isPublished } : i) };
        return m;
      }));
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 py-6 select-none">
      <div className="flex items-center justify-between gap-3 shrink-0 px-1">
        <h2 className="text-lg font-black tracking-tight text-gray-900">Course Modules Manager</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsAddingModule(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-deep text-white rounded-xl transition cursor-pointer shadow-sm hover:shadow">
            <Plus size={14} /> <span>Add Section</span>
          </button>
          <button onClick={toggleAll} className="flex items-center justify-center px-4 py-2 text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition cursor-pointer">
            {areAllCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      </div>

      {isAddingModule && (
        <div className="border border-purple-200/50 bg-brand/3 p-5 rounded-2xl flex flex-col gap-3">
          <h4 className="text-xs font-extrabold text-brand uppercase tracking-wider">Create New Module Section</h4>
          <div className="flex gap-3">
            <input
              autoFocus
              type="text"
              placeholder="e.g. Week 2: Design Systems..."
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand/40 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddModule();
                if (e.key === "Escape") { setIsAddingModule(false); setCreateModuleError(""); }
              }}
            />
            <button onClick={handleAddModule} disabled={isCreatingModule} className="flex items-center gap-1.5 px-5 py-2 bg-brand hover:bg-brand-deep disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm">
              {isCreatingModule && <Loader size={12} className="animate-spin" />}
              {isCreatingModule ? "Creating..." : "Add Section"}
            </button>
            <button onClick={() => { setIsAddingModule(false); setCreateModuleError(""); }} disabled={isCreatingModule} className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 text-xs font-bold cursor-pointer disabled:opacity-60">
              Cancel
            </button>
          </div>
          {createModuleError && <p className="text-xs text-red-500 font-medium mt-1">{createModuleError}</p>}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {modulesLoading ? (
          [3, 2, 4].map((itemCount, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white animate-pulse">
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/80 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md bg-gray-200" />
                  <div className="h-3 rounded-full bg-gray-200" style={{ width: `${90 + i * 45}px` }} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 rounded-xl bg-gray-100 w-20" />
                  <div className="h-7 rounded-xl bg-gray-100 w-6" />
                </div>
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
        ) : modules.map((mod) => (
          <div key={mod.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
            <div onClick={() => toggleModule(mod.id)} className="flex items-center justify-between px-5 py-4 bg-gray-50/80 border-b border-gray-200 cursor-pointer select-none group">
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span onClick={(e) => { e.stopPropagation(); toggleModule(mod.id); }} className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0 p-1 hover:bg-gray-200 rounded-md">
                  {mod.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>

                {editingModuleId === mod.id ? (
                  <div className="flex-1 flex items-center gap-2 max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={editingModuleTitle}
                      onChange={(e) => setEditingModuleTitle(e.target.value)}
                      className="flex-1 px-3 py-1 text-xs border border-purple-300 rounded-lg outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameModule(mod.id);
                        if (e.key === "Escape") setEditingModuleId(null);
                      }}
                    />
                    <button onClick={() => handleRenameModule(mod.id)} className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer">Save</button>
                    <button onClick={() => setEditingModuleId(null)} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    {mod.prefix && <span className="text-sm font-extrabold text-gray-700 shrink-0">{mod.prefix}</span>}
                    <h3 className="text-xs font-black tracking-wider text-gray-700 uppercase truncate">{mod.title}</h3>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div onClick={(e) => handleToggleModulePublish(mod.id, e)} title={mod.isPublished ? "Published (click to unpublish)" : "Draft (click to publish)"} className="flex items-center justify-center shrink-0 cursor-pointer">
                  {mod.isPublished ? <CheckCircle size={15} className="text-green-500 hover:scale-110 transition-transform" /> : <EyeOff size={15} className="text-gray-400 hover:scale-110 transition-transform" />}
                </div>
                <button onClick={() => setAddingItemTo(mod.id)} className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-brand border border-purple-100 hover:bg-brand/5 transition cursor-pointer">
                  <Plus size={11} /> <span>Add Item</span>
                </button>
                <button
                  onClick={(e) => openModuleMenu(e, mod.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="More options"
                >
                  <MoreVertical size={15} />
                </button>
              </div>
            </div>

            {addingItemTo === mod.id && (
              <div className="p-4 bg-purple-50/30 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-brand uppercase tracking-wider">Add Section Item</h4>
                  <button onClick={() => setAddingItemTo(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"><X size={12} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Item title..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    className="md:col-span-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand/40 transition-colors"
                  />
                  <select value={newItemType} onChange={(e) => setNewItemType(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer focus:border-brand/40">
                    <option value="document">Document</option>
                    <option value="link">Link</option>
                    <option value="attachment">Attachment</option>
                  </select>
                </div>
                {newItemType === "link" && (
                  <input
                    type="url"
                    placeholder="https://…"
                    value={newItemUrl}
                    onChange={(e) => setNewItemUrl(e.target.value)}
                    aria-label="Link address"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand/40 transition-colors"
                  />
                )}
                {newItemType === "attachment" && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <Paperclip size={14} />
                    <span className="truncate">
                      {uploadingAttachment ? "Uploading…" : newItemUrl ? "File uploaded. Choose another to replace it" : "Choose a file to upload"}
                    </span>
                    <input type="file" className="sr-only" disabled={uploadingAttachment} onChange={(e) => handleAttachmentPick(e.target.files?.[0])} />
                  </label>
                )}
                {newItemType === "link" && (
                  <div className="flex items-center gap-2 mt-1">
                    <input type="checkbox" id="isExternal" checked={isNewItemExternal} onChange={(e) => setIsNewItemExternal(e.target.checked)} className="rounded border-gray-300 text-brand focus:ring-brand" />
                    <label htmlFor="isExternal" className="text-[10px] font-bold text-gray-500 cursor-pointer">Open in New Window (External Link)</label>
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => handleAddItem(mod.id)} className="px-4 py-1.5 bg-brand text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-brand-deep transition cursor-pointer">Add Item</button>
                  <button onClick={() => setAddingItemTo(null)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
                </div>
              </div>
            )}

            {mod.isOpen && (
              <div className="flex flex-col">
                {mod.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 font-medium bg-gray-50/10">No items in this module section</div>
                ) : (
                  mod.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3.5 px-6 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/40 transition-colors group/item">
                      <div className="flex-1 flex items-center gap-3.5 min-w-0">
                        <span className="text-gray-400 shrink-0">
                          {item.type === "attachment" && <Paperclip size={14} />}
                          {item.type === "document" && <FileText size={14} />}
                          {item.type === "link" && <LinkIcon size={14} />}
                        </span>

                        {editingItemId === item.id && editingItemModuleId === mod.id ? (
                          <div className="flex items-center gap-2 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              type="text"
                              value={editingItemLabel}
                              onChange={(e) => setEditingItemLabel(e.target.value)}
                              className="flex-1 px-3 py-1 text-xs border border-purple-300 rounded-lg outline-none font-medium"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameItem(mod.id, item.id);
                                if (e.key === "Escape") { setEditingItemId(null); setEditingItemModuleId(null); }
                              }}
                            />
                            <button onClick={() => handleRenameItem(mod.id, item.id)} className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer">Save</button>
                            <button onClick={() => { setEditingItemId(null); setEditingItemModuleId(null); }} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            {item.type === "link" ? (
                              <a href="#" onClick={(e) => { e.preventDefault(); openItem(item); }} className="text-xs font-bold !text-blue-600 hover:underline flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{item.label}</span>
                                {item.isExternal && <ExternalLink size={11} className="shrink-0" />}
                              </a>
                            ) : item.type === "document" ? (
                              <span className="text-xs font-bold text-gray-700 hover:text-brand hover:underline truncate cursor-pointer" onClick={() => navigate(`/courses/${activeCourseId}/items/${item.id}`)}>
                                {item.label}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-gray-700 truncate cursor-pointer hover:text-gray-900" onClick={() => openItem(item)}>
                                {item.label}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div onClick={() => handleToggleItemPublish(mod.id, item.id)} title={item.isPublished ? "Published (click to unpublish)" : "Draft (click to publish)"} className="flex items-center justify-center shrink-0 cursor-pointer">
                          {item.isPublished ? <CheckCircle size={15} className="text-green-500 hover:scale-110 transition-transform shadow-2xs" /> : <EyeOff size={15} className="text-gray-400 hover:scale-110 transition-transform" />}
                        </div>
                        <button
                          onClick={(e) => openItemMenu(e, mod.id, item.id)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition opacity-0 group-hover/item:opacity-100 cursor-pointer shrink-0"
                          title="More options"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Single fixed-position dropdown — never clips */}
      {openMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[150px]"
            style={{ top: openMenu.top, right: openMenu.right }}
          >
            {openMenu.type === "module" ? (
              <>
                <button
                  onClick={() => {
                    const mod = modules.find(m => m.id === openMenu.id);
                    setEditingModuleId(openMenu.id);
                    setEditingModuleTitle(mod?.title || "");
                    setOpenMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Pencil size={13} className="text-gray-400" /> Rename
                </button>
                <button
                  onClick={() => { handleDuplicateModule(openMenu.id); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Copy size={13} className="text-gray-400" /> Duplicate
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setDeleteConfirm({ type: "module", modId: openMenu.id }); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const mod = modules.find(m => m.id === openMenu.modId);
                    const item = mod?.items?.find(i => i.id === openMenu.id);
                    setEditingItemId(openMenu.id);
                    setEditingItemModuleId(openMenu.modId);
                    setEditingItemLabel(item?.label || "");
                    setOpenMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Pencil size={13} className="text-gray-400" /> Rename
                </button>
                <button
                  onClick={() => { handleDuplicateItem(openMenu.modId, openMenu.id); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Copy size={13} className="text-gray-400" /> Duplicate
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setDeleteConfirm({ type: "item", modId: openMenu.modId, itemId: openMenu.id }); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-base font-black text-gray-900 mb-1">
              {deleteConfirm.type === "module" ? "Delete section?" : "Delete item?"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {deleteConfirm.type === "module"
                ? "This will permanently remove the section and all its items. This cannot be undone."
                : "This will permanently remove this item. This cannot be undone."}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "module") handleDeleteModule(deleteConfirm.modId);
                  else handleDeleteItem(deleteConfirm.modId, deleteConfirm.itemId);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
