import { notify } from "../../components/UI/feedback";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageCanvas from "../../components/PageCanvas";
import { getPageContent, savePageContent, getCourseModules, openModuleItemUrl } from "../../services/moduleService";
import { 
    Bold, 
    Italic, 
    Underline, 
    Strikethrough, 
    Code, 
    Heading1, 
    Heading2, 
    Heading3, 
    List, 
    ListOrdered, 
    Quote, 
    Image as ImageIcon, 
    Video as VideoIcon, 
    Code2, 
    AlertCircle, 
    Eye, 
    Edit3, 
    Save, 
    ArrowLeft, 
    ArrowRight,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Palette,
    Paperclip,
    FileText,
    Link as LinkIcon,
    Plus,
    X,
    ExternalLink,
    Loader
} from "lucide-react";


// Curated brand color options for text
const TEXT_COLORS = [
    { label: "Default", color: "#1f2937" }, // Slate 800
    { label: "Deep Purple", color: "#3C0078" }, // Brand purple
    { label: "Slate Gray", color: "#6b7280" },
    { label: "Indigo Blue", color: "#2563eb" },
    { label: "Emerald Green", color: "#059669" },
    { label: "Warm Amber", color: "#d97706" },
    { label: "Crimson Red", color: "#dc2626" },
];

// Presets for quick-select images to wow the user immediately without typing a URL
const IMAGE_PRESETS = [
    { label: "Abstract Learning Pattern", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80" },
    { label: "Design System Grid", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80" },
    { label: "Creative Workspace", url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1000&q=80" }
];


export default function CourseItemView({ activeCourseId, activeItemId, isStudentView = false }) {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("Blank Page");
    
    const [saveAlert, setSaveAlert] = useState(false);
    const [sections, setSections] = useState([]);
    const [pageLoading, setPageLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pageType, setPageType] = useState(null); // 'module' | 'item'
    const canvasRef = useRef(null);

    // Flattened ordered item list derived from course modules – used for Prev/Next navigation
    const [allItems, setAllItems] = useState([]);

    useEffect(() => {
        if (!activeCourseId) return;
        getCourseModules(activeCourseId)
            .then(mods => {
                const flat = [];
                const filteredMods = isStudentView
                    ? (mods ?? []).filter(m => m.isPublished)
                    : (mods ?? []);

                for (const mod of filteredMods) {
                    const items = isStudentView
                        ? (mod.items ?? []).filter(i => i.isPublished)
                        : (mod.items ?? []);
                    for (const item of items) {
                        flat.push({ id: item.id, label: item.label, type: item.type, isExternal: item.isExternal });
                    }
                }
                setAllItems(flat);
            })
            .catch(console.error);
    }, [activeCourseId, isStudentView]);

    // Compute Previous and Next items from the live course modules list
    const { prevItem, nextItem } = useMemo(() => {
        const index = allItems.findIndex(item => item.id === activeItemId);
        if (index === -1) return { prevItem: null, nextItem: null };
        return {
            prevItem: index > 0 ? allItems[index - 1] : null,
            nextItem: index < allItems.length - 1 ? allItems[index + 1] : null,
        };
    }, [allItems, activeItemId]);

    // Handle Prev/Next click
    const handleItemNavigation = (item) => {
        if (!item) return;
        if (item.type === "document") {
            navigate(`/courses/${activeCourseId}/items/${item.id}${isStudentView ? "?viewAs=student" : ""}`);
        } else if (item.type === "link") {
            if (!openModuleItemUrl(item)) notify("This link has no address yet.");
        } else {
            if (!openModuleItemUrl(item)) notify("This attachment has no file yet.");
        }
    };

    // Build a default single empty text section
    const makeDefaultSections = (fallbackTitle) => {
        const emptyDoc = {
            type: "doc",
            content: [
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: fallbackTitle }] },
                { type: "paragraph", content: [{ type: "text", text: "Click Edit to start building this page..." }] },
            ],
        };
        return [{ id: `text-${Date.now()}`, type: "text", content: emptyDoc }];
    };

    // Load content from backend whenever the active item changes
    useEffect(() => {
        if (!activeItemId) return;
        let mounted = true;
        setPageLoading(true);
        setIsEditing(false);

        getPageContent(activeItemId)
            .then(({ pageType: pt, title: t, sections: s, raw }) => {
                if (!mounted) return;
                setPageType(pt);
                setTitle(t || "Untitled");
                if (s && s.length > 0) {
                    setSections(s);
                } else {
                    setSections(makeDefaultSections(t || raw?.title || raw?.label || "New Page"));
                }
            })
            .catch(err => {
                console.error("Failed to load page content:", err);
                if (mounted) {
                    setTitle("New Page");
                    setSections(makeDefaultSections("New Page"));
                }
            })
            .finally(() => { if (mounted) setPageLoading(false); });

        return () => { mounted = false; };
    }, [activeItemId]);

    const handleSave = async () => {
        if (!canvasRef.current) return;
        const updatedSections = canvasRef.current.getSections();
        setSections(updatedSections);
        setSaving(true);
        try {
            await savePageContent(activeItemId, pageType, { title, sections: updatedSections });
            setSaveAlert(true);
            setIsEditing(false);
            setTimeout(() => setSaveAlert(false), 2000);
        } catch (err) {
            console.error("Failed to save page content:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full flex flex-col min-h-full">
            {pageLoading && (
                <div className="flex flex-col gap-5 animate-pulse p-6 md:p-10">
                    <div className="h-9 rounded-2xl bg-gray-200 w-1/2" />
                    <div className="flex flex-col gap-3 mt-4">
                        {[90, 75, 85, 60, 80].map((w, i) => (
                            <div key={i} className={`h-4 rounded-full ${i % 2 === 0 ? "bg-gray-200" : "bg-gray-100"}`} style={{ width: `${w}%` }} />
                        ))}
                    </div>
                    <div className="h-48 rounded-3xl bg-gray-100 mt-2" />
                    <div className="flex flex-col gap-3">
                        {[70, 85, 55, 75].map((w, i) => (
                            <div key={i} className="h-4 rounded-full bg-gray-100" style={{ width: `${w}%` }} />
                        ))}
                    </div>
                    <div className="h-28 rounded-3xl bg-gray-100" />
                </div>
            )}
            {!pageLoading && (<>
            {/* Top Editor controls and Toggles */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/courses/${activeCourseId}/modules${window.location.search}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 transition cursor-pointer shadow-2xs hover:border-gray-300"
                    >
                        <ArrowLeft size={13} className="text-gray-500" />
                        <span>Back to Modules</span>
                    </button>
                </div>
                
                {/* Save alert toast */}
                {saveAlert && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-extrabold rounded-lg shadow-2xs border border-green-100 animate-pulse">
                        <Sparkles size={13} className="text-green-500" />
                        <span>Layout Saved Successfully!</span>
                    </div>
                )}

                {/* Edit/View toggle for teachers */}
                {!isStudentView && (
                    <button
                        onClick={() => {
                            if (isEditing) {
                                handleSave();
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        disabled={saving}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl cursor-pointer shadow-2xs border transition disabled:opacity-60 disabled:cursor-not-allowed ${
                            isEditing 
                            ? "bg-green-600 border-green-700 text-white hover:bg-green-700" 
                            : "bg-brand border-brand-deep text-white hover:bg-brand-deep"
                        }`}
                    >
                        {isEditing ? (
                            <>
                                {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                                <span>{saving ? "Saving..." : "Save Changes"}</span>
                            </>
                        ) : (
                            <>
                                <Edit3 size={13} />
                                <span>Edit Layout</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Title / Editor Container */}
            <div className="flex-1 flex flex-col bg-transparent min-h-[500px] p-6 md:p-10">
                {/* Title Input or View Label */}
                {isEditing ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-3xl font-black outline-none border-b border-gray-100 focus:border-brand/40 pb-2 mb-6 w-full text-gray-900 transition-colors placeholder:text-gray-300"
                        placeholder="Page Title"
                    />
                ) : (
                    <h1 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">{title}</h1>
                )}
                <PageCanvas
                    ref={canvasRef}
                    sections={sections}
                    setSections={setSections}
                    isEditing={isEditing}
                    placeholder="Write some beautiful syllabus materials, assignments guidelines or course information here..."
                />
            </div>

            {/* Premium Bottom Navigation Footer (Canvas-style Prev / Next) */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8 shrink-0 pb-12 select-none">
                {prevItem ? (
                    <button
                        onClick={() => handleItemNavigation(prevItem)}
                        className="flex flex-col text-left items-start gap-1 group py-2.5 px-5 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xs transition cursor-pointer max-w-[280px] md:max-w-[340px]"
                    >
                        <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                            <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span>Previous Item</span>
                        </span>
                        <span className="text-xs font-bold text-brand truncate w-full mt-0.5 group-hover:underline">
                            {prevItem.label}
                        </span>
                    </button>
                ) : (
                    <div className="w-10" />
                )}

                {nextItem ? (
                    <button
                        onClick={() => handleItemNavigation(nextItem)}
                        className="flex flex-col text-right items-end gap-1 group py-2.5 px-5 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xs transition cursor-pointer max-w-[280px] md:max-w-[340px]"
                    >
                        <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                            <span>Next Item</span>
                            <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                        <span className="text-xs font-bold text-brand truncate w-full mt-0.5 group-hover:underline">
                            {nextItem.label}
                        </span>
                    </button>
                ) : (
                    <div className="w-10" />
                )}
            </div>
            </>)}
        </div>
    );
}
