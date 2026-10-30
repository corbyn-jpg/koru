import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import NovelEditor from "./NovelEditor";
import { uploadImageToCloudinary } from "../services/cloudinaryService";
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
    Plus,
    X,
    ChevronUp,
    ChevronDown,
    Palette,
    Paperclip,
    AlertCircle,
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

// Presets for quick-select images
const IMAGE_PRESETS = [
    { label: "Abstract Learning Pattern", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80" },
    { label: "Design System Grid", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80" },
    { label: "Creative Workspace", url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1000&q=80" }
];

const PageCanvas = forwardRef(({
    sections = [],
    setSections,
    isEditing = false,
    placeholder = "Write some beautiful content here..."
}, ref) => {
    const [editorInstance, setEditorInstance] = useState(null);
    const [showEmbedMenu, setShowEmbedMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Embed states
    const [imageUrl, setImageUrl] = useState("");
    const [codeSnippet, setCodeSnippet] = useState("");
    const [youtubeUrl, setYoutubeUrl] = useState("");

    const fileInputRef = useRef(null);
    const editorMapRef = useRef({});

    // Expose serialized sections to parent component on save
    useImperativeHandle(ref, () => ({
        getSections: () => {
            return sections.map(s => {
                if (s.type === "text") {
                    const inst = editorMapRef.current[s.id];
                    return inst ? { ...s, content: inst.getJSON() } : s;
                }
                return s;
            });
        }
    }));

    // Text formatting actions helper
    const handleFormat = (command, val = undefined) => {
        if (!editorInstance) return;
        editorInstance.chain().focus();

        if (command === "heading") {
            editorInstance.chain().focus().toggleHeading({ level: val }).run();
        } else if (command === "paragraph") {
            editorInstance.chain().focus().setParagraph().run();
        } else if (command === "bold") {
            editorInstance.chain().focus().toggleBold().run();
        } else if (command === "italic") {
            editorInstance.chain().focus().toggleItalic().run();
        } else if (command === "underline") {
            editorInstance.chain().focus().toggleUnderline().run();
        } else if (command === "strike") {
            editorInstance.chain().focus().toggleStrike().run();
        } else if (command === "code") {
            editorInstance.chain().focus().toggleCode().run();
        } else if (command === "bullet") {
            editorInstance.chain().focus().toggleBulletList().run();
        } else if (command === "ordered") {
            editorInstance.chain().focus().toggleOrderedList().run();
        } else if (command === "quote") {
            editorInstance.chain().focus().toggleBlockquote().run();
        } else if (command === "color") {
            editorInstance.chain().focus().setColor(val).run();
        }
    };

    // Font size sizing helper (custom spans inside editor)
    const handleFontSize = (sizeName) => {
        if (!editorInstance) return;
        let fontSize = "15px";
        if (sizeName === "small") fontSize = "12px";
        if (sizeName === "large") fontSize = "20px";
        if (sizeName === "xlarge") fontSize = "28px";

        editorInstance.chain().focus().insertContent(`<span style="font-size: ${fontSize}">${editorInstance.state.doc.slice(editorInstance.state.selection.from, editorInstance.state.selection.to).textContent || "Sample Sized Text"}</span>`).run();
    };

    // Image file upload → Cloudinary CDN URL
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = "";
        try {
            setUploading(true);
            setShowEmbedMenu(false);
            const url = await uploadImageToCloudinary(file);
            handleInsertImage(url);
        } catch (err) {
            console.error("Image upload failed:", err);
        } finally {
            setUploading(false);
        }
    };

    // Image insertion – adds a new embed section
    const handleInsertImage = (url) => {
        if (!url.trim()) return;
        const html = `<img src="${url.trim()}" alt="Visual" style="width:100%;max-height:340px;object-fit:cover;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin:24px 0;display:block;" />`;
        setSections(prev => [...prev, { id: `embed-${Date.now()}`, type: "embed", html }]);
        setImageUrl("");
        setShowEmbedMenu(false);
    };

    // Video insertion – appends to embedsHtml state
    const handleInsertVideo = (url) => {
        if (!url.trim()) return;
        let embedUrl = url.trim();
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            if (match && match[2].length === 11) {
                embedUrl = `https://www.youtube.com/embed/${match[2]}`;
            }
        }
        const html = `<div style="position:relative;width:100%;padding-top:56.25%;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);margin:24px 0;"><iframe src="${embedUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`;
        setSections(prev => [...prev, { id: `embed-${Date.now()}`, type: "embed", html }]);
        setYoutubeUrl("");
        setShowEmbedMenu(false);
    };

    // Code embed insertion
    const handleInsertCode = () => {
        if (!codeSnippet.trim()) return;
        const escaped = codeSnippet.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const html = `<pre style="background:#111827;color:#f3f4f6;padding:20px;border-radius:16px;font-family:monospace;font-size:12px;overflow-x:auto;margin:24px 0;"><code>${escaped}</code></pre>`;
        setSections(prev => [...prev, { id: `embed-${Date.now()}`, type: "embed", html }]);
        setCodeSnippet("");
        setShowEmbedMenu(false);
    };

    // Callout box insertion
    const handleInsertCallout = () => {
        const html = `<div style="padding:20px 24px;background:rgba(60,0,120,0.05);border-left:4px solid #3C0078;border-radius:0 16px 16px 0;margin:24px 0;color:#3C0078;"><div style="font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">ℹ Alert Box</div><div style="font-size:13px;font-weight:500;opacity:0.9;">Enter your notification details or custom block guidelines here.</div></div>`;
        setSections(prev => [...prev, { id: `embed-${Date.now()}`, type: "embed", html }]);
        setShowEmbedMenu(false);
    };

    // Move a section one step up or down
    const moveSection = (id, direction) => {
        setSections(prev => {
            const idx = prev.findIndex(s => s.id === id);
            if (idx === -1) return prev;
            const newIdx = direction === "up" ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
            return next;
        });
    };

    // Remove a section by id
    const removeSection = (id) => {
        setSections(prev => prev.filter(s => s.id !== id));
    };

    // Add a new empty text editor section at the bottom
    const addTextSection = () => {
        const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };
        setSections(prev => [...prev, { id: `text-${Date.now()}`, type: "text", content: emptyDoc }]);
    };

    return (
        <div className="flex-1 flex flex-col bg-transparent">
            {/* Gorgeous Canvas-Style Editor Toolbar */}
            {isEditing && (
                <div className="sticky top-2 flex flex-wrap items-center gap-1 bg-gray-50/95 backdrop-blur-xs border border-gray-200/80 p-2 rounded-2xl mb-6 shadow-md z-30 select-none">
                    {/* Heading Selector */}
                    <button onClick={() => handleFormat("paragraph")} className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200 rounded-lg" title="Paragraph">P</button>
                    <button onClick={() => handleFormat("heading", 1)} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Heading 1"><Heading1 size={14} /></button>
                    <button onClick={() => handleFormat("heading", 2)} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Heading 2"><Heading2 size={14} /></button>
                    <button onClick={() => handleFormat("heading", 3)} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Heading 3"><Heading3 size={14} /></button>

                    <div className="w-px h-4 bg-gray-300 mx-1" />

                    {/* Font size picker dropdown */}
                    <div className="relative group/size">
                        <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-extrabold text-gray-600 hover:bg-gray-200 rounded-lg">
                            <span>Size</span>
                            <ChevronDown size={10} />
                        </button>
                        <div className="absolute hidden group-hover/size:flex flex-col bg-white border border-gray-200 p-1 rounded-xl shadow-lg mt-1 min-w-[120px] left-0">
                            <button onClick={() => handleFontSize("small")} className="text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Small (12px)</button>
                            <button onClick={() => handleFontSize("normal")} className="text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Normal (15px)</button>
                            <button onClick={() => handleFontSize("large")} className="text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Large (20px)</button>
                            <button onClick={() => handleFontSize("xlarge")} className="text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-black text-sm">X-Large (28px)</button>
                        </div>
                    </div>

                    <div className="w-px h-4 bg-gray-300 mx-1" />

                    {/* Standard Mark Styles */}
                    <button onClick={() => handleFormat("bold")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Bold"><Bold size={14} /></button>
                    <button onClick={() => handleFormat("italic")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Italic"><Italic size={14} /></button>
                    <button onClick={() => handleFormat("underline")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Underline"><Underline size={14} /></button>
                    <button onClick={() => handleFormat("strike")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Strikethrough"><Strikethrough size={14} /></button>
                    <button onClick={() => handleFormat("code")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Inline Code"><Code size={14} /></button>

                    <div className="w-px h-4 bg-gray-300 mx-1" />

                    {/* Color Picker dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColorMenu(!showColorMenu)}
                            className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-0.5"
                            title="Text Color"
                        >
                            <Palette size={14} />
                            <ChevronDown size={10} />
                        </button>
                        {showColorMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowColorMenu(false)} />
                                <div className="absolute z-30 bg-white border border-gray-200 p-2 rounded-2xl shadow-xl mt-1.5 flex flex-col gap-1 min-w-[140px] left-0">
                                    <div className="text-[9px] font-black text-gray-400 uppercase px-1 mb-1 tracking-wider">Brand Palette</div>
                                    {TEXT_COLORS.map(c => (
                                        <button
                                            key={c.label}
                                            onClick={() => {
                                                handleFormat("color", c.color);
                                                setShowColorMenu(false);
                                            }}
                                            className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-100 rounded-lg w-full text-left font-semibold text-gray-700 cursor-pointer"
                                        >
                                            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: c.color || "#000" }} />
                                            <span>{c.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-300 mx-1" />

                    {/* Lists and Quotes */}
                    <button onClick={() => handleFormat("bullet")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Bullet List"><List size={14} /></button>
                    <button onClick={() => handleFormat("ordered")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Numbered List"><ListOrdered size={14} /></button>
                    <button onClick={() => handleFormat("quote")} className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg" title="Blockquote"><Quote size={14} /></button>

                    <div className="w-px h-4 bg-gray-300 mx-1" />

                    {/* Interactive "+ Insert Embed" Menu */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <div className="relative">
                        <button
                            onClick={() => setShowEmbedMenu(!showEmbedMenu)}
                            disabled={uploading}
                            className="flex items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-brand border border-purple-100 hover:bg-purple-100 cursor-pointer shadow-3xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Plus size={11} />
                            <span>{uploading ? "Uploading…" : "Insert Embed"}</span>
                        </button>
                        {showEmbedMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowEmbedMenu(false)} />
                                <div className="absolute z-30 bg-white border border-gray-200 p-4 rounded-3xl shadow-2xl mt-1.5 flex flex-col gap-3 min-w-[320px] left-0 md:left-auto md:right-0">
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 mb-0.5">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Media Embed Suite</span>
                                        <button onClick={() => setShowEmbedMenu(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"><X size={12} /></button>
                                    </div>

                                    {/* Image section */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Insert Image</label>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="flex items-center justify-center gap-2 py-2 px-3 border-2 border-dashed border-brand/20 rounded-xl text-[10px] font-bold text-brand hover:bg-brand/5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <Paperclip size={12} />
                                            {uploading ? "Uploading…" : "Upload from device"}
                                        </button>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Or paste image URL..."
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand/40"
                                            />
                                            <button onClick={() => handleInsertImage(imageUrl)} className="px-3 py-1.5 bg-brand text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer">Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {IMAGE_PRESETS.map((p, idx) => (
                                                <button
                                                    key={p.label}
                                                    onClick={() => handleInsertImage(p.url)}
                                                    className="text-[9px] font-bold px-2 py-1 bg-gray-100 text-gray-600 hover:bg-brand/5 hover:text-brand rounded-md transition-colors text-left truncate max-w-[140px] cursor-pointer"
                                                    title={p.label}
                                                >
                                                    Preset {idx + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 my-1" />

                                    {/* YouTube Video iframe */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">YouTube/Vimeo Embed</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Paste video URL..."
                                                value={youtubeUrl}
                                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand/40"
                                            />
                                            <button onClick={() => handleInsertVideo(youtubeUrl)} className="px-3 py-1.5 bg-brand text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer">Embed</button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 my-1" />

                                    {/* Styled Code snippet */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Code Snippet</label>
                                        <textarea
                                            placeholder="Paste source code snippet here..."
                                            rows={2}
                                            value={codeSnippet}
                                            onChange={(e) => setCodeSnippet(e.target.value)}
                                            className="bg-white border border-gray-200 rounded-xl p-2 text-xs outline-none focus:border-brand/40 font-mono resize-none"
                                        />
                                        <button onClick={handleInsertCode} className="py-1 px-3 bg-brand text-white text-[10px] font-bold uppercase rounded-lg self-end mt-1 cursor-pointer">Insert Block</button>
                                    </div>

                                    <div className="h-px bg-gray-100 my-1" />

                                    {/* Styled Notice Box */}
                                    <button
                                        onClick={handleInsertCallout}
                                        className="flex items-center justify-center gap-2 p-2 bg-brand/3 border border-brand/10 text-brand hover:bg-brand/8 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        <AlertCircle size={13} />
                                        <span>Insert Styled Alert Callout</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Sections — text and embeds rendered in reorderable order */}
            <div className="flex-1 flex flex-col gap-6 font-medium text-xs leading-relaxed text-gray-800">
                {sections.map((section, idx) => (
                    <div key={section.id} className="relative">
                        {/* Section reorder / remove controls — edit mode only */}
                        {isEditing && (
                            <div className="flex items-center gap-1 mb-2 pb-1.5 border-b border-gray-200 select-none">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-300 mr-auto select-none">
                                    {section.type === "text" ? "Text" : "Embed"}
                                </span>
                                <button
                                    onClick={() => moveSection(section.id, "up")}
                                    disabled={idx === 0}
                                    title="Move up"
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 transition-colors cursor-pointer"
                                >
                                    <ChevronUp size={13} />
                                </button>
                                <button
                                    onClick={() => moveSection(section.id, "down")}
                                    disabled={idx === sections.length - 1}
                                    title="Move down"
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 transition-colors cursor-pointer"
                                >
                                    <ChevronDown size={13} />
                                </button>
                                {sections.length > 1 && (
                                    <button
                                        onClick={() => removeSection(section.id)}
                                        title="Remove section"
                                        className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        )}

                        {section.type === "text" ? (
                            <div
                                className="novel-editor-wrapper select-text relative w-full"
                                onFocus={() => setEditorInstance(editorMapRef.current[section.id])}
                            >
                                <NovelEditor
                                    initialContent={section.content}
                                    editable={isEditing}
                                    placeholder={placeholder}
                                    onCreate={({ editor }) => {
                                        editorMapRef.current[section.id] = editor;
                                        // If this is the first editor, make it the default active formatting instance
                                        if (!editorInstance) {
                                            setEditorInstance(editor);
                                        }
                                    }}
                                    onUpdate={({ editor }) => {
                                        editorMapRef.current[section.id] = editor;
                                    }}
                                    showBubbleMenu={false}
                                    showSlashCommands={false}
                                    className="min-h-[1.5rem]"
                                />
                            </div>
                        ) : (
                            <div className="select-text" dangerouslySetInnerHTML={{ __html: section.html }} />
                        )}
                    </div>
                ))}

                {/* Add text section — edit mode only */}
                {isEditing && (
                    <button
                        onClick={addTextSection}
                        className="flex items-center gap-2 self-start text-[11px] font-bold text-brand/60 hover:text-brand border border-dashed border-brand/20 hover:border-brand/40 rounded-xl px-4 py-2.5 transition hover:bg-brand/5 cursor-pointer"
                    >
                        <Plus size={13} />
                        Add text section
                    </button>
                )}
            </div>
        </div>
    );
});

PageCanvas.displayName = "PageCanvas";

export default PageCanvas;
