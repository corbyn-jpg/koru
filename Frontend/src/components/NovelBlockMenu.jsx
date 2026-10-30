import React, { useRef, useEffect, useState, useCallback } from "react";
import { useEditor } from "novel";
import {
    Plus,
    GripVertical,
    Type,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code2,
    Copy,
    CopyPlus,
    Trash2,
    Palette,
    ChevronRight,
} from "lucide-react";

// ── Turn Into options (command + args for single-chain execution) ──
const TURN_INTO_OPTIONS = [
    { label: "Text", icon: Type, command: "setParagraph", args: undefined },
    { label: "Heading 1", icon: Heading1, command: "setHeading", args: { level: 1 } },
    { label: "Heading 2", icon: Heading2, command: "setHeading", args: { level: 2 } },
    { label: "Heading 3", icon: Heading3, command: "setHeading", args: { level: 3 } },
    { label: "Bullet List", icon: List, command: "toggleBulletList", args: undefined },
    { label: "Numbered List", icon: ListOrdered, command: "toggleOrderedList", args: undefined },
    { label: "Quote", icon: Quote, command: "toggleBlockquote", args: undefined },
    { label: "Code Block", icon: Code2, command: "toggleCodeBlock", args: undefined },
];

// ── Color options ──
const TEXT_COLORS = [
    { label: "Default", color: null },
    { label: "Gray", color: "#9ca3af" },
    { label: "Red", color: "#ef4444" },
    { label: "Orange", color: "#f97316" },
    { label: "Green", color: "#22c55e" },
    { label: "Blue", color: "#3b82f6" },
    { label: "Purple", color: "#8b5cf6" },
];

const BG_COLORS = [
    { label: "None", color: null },
    { label: "Gray", color: "#f3f4f6" },
    { label: "Red", color: "#fef2f2" },
    { label: "Orange", color: "#fff7ed" },
    { label: "Yellow", color: "#fefce8" },
    { label: "Green", color: "#f0fdf4" },
    { label: "Blue", color: "#eff6ff" },
    { label: "Purple", color: "#faf5ff" },
];

export default function NovelBlockMenu() {
    const { editor } = useEditor();
    const [handlePos, setHandlePos] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [subMenu, setSubMenu] = useState(null); // "turnInto" | "color" | null
    const [hoveredBlock, setHoveredBlock] = useState(null);
    const containerRef = useRef(null);
    const menuRef = useRef(null);
    const handleHovered = useRef(false);
    const savedBlockPos = useRef(null); // Store block position when menu opens

    // Find the closest top-level block by Y position
    const getClosestBlock = useCallback((clientY) => {
        if (!editor) return null;
        const editorDom = editor.view.dom;
        const children = Array.from(editorDom.children);
        let closest = null;
        let closestDist = Infinity;

        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // Match if cursor is vertically within the block (with tolerance)
            if (clientY >= rect.top - 4 && clientY <= rect.bottom + 4) {
                const dist = Math.abs(clientY - (rect.top + rect.height / 2));
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = child;
                }
            }
        }

        // Fallback: if no block matched, find the absolute nearest one
        if (!closest && children.length > 0) {
            for (const child of children) {
                const rect = child.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dist = Math.abs(clientY - mid);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = child;
                }
            }
        }

        return closest;
    }, [editor]);

    // Track mouse movement on the wrapper so the padding/gutter area is included
    useEffect(() => {
        if (!editor) return;
        const wrapper = editor.view.dom.closest('.novel-editor-wrapper');
        if (!wrapper) return;

        const hoverArea = wrapper.parentElement || wrapper;

        const onMouseMove = (e) => {
            if (menuOpen) return;
            const block = getClosestBlock(e.clientY);
            if (!block) {
                setHandlePos(null);
                setHoveredBlock(null);
                return;
            }

            const wrapperRect = wrapper.getBoundingClientRect();
            const blockRect = block.getBoundingClientRect();
            // Get the first line's height for centering
            const computedStyle = window.getComputedStyle(block);
            const fontSize = parseFloat(computedStyle.fontSize) || 16;
            const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.5;
            setHandlePos({
                top: blockRect.top - wrapperRect.top,
                firstLineHeight: lineHeight,
            });
            setHoveredBlock(block);
        };

        const onMouseLeave = (e) => {
            if (menuOpen) return;
            const related = e.relatedTarget;
            if (hoverArea.contains(related)) return;
            if (containerRef.current && containerRef.current.contains(related)) return;
            // Small delay to allow moving to handles
            setTimeout(() => {
                if (!handleHovered.current && !menuOpen) {
                    setHandlePos(null);
                    setHoveredBlock(null);
                }
            }, 100);
        };

        hoverArea.addEventListener("mousemove", onMouseMove);
        hoverArea.addEventListener("mouseleave", onMouseLeave);
        return () => {
            hoverArea.removeEventListener("mousemove", onMouseMove);
            hoverArea.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [editor, menuOpen, getClosestBlock]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const onClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
                setSubMenu(null);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [menuOpen]);

    // ── Helper: get ProseMirror position for a DOM block ──
    const getBlockPos = useCallback((block) => {
        if (!block || !editor) return null;
        try {
            const pos = editor.view.posAtDOM(block, 0);
            const resolvedPos = editor.state.doc.resolve(pos);
            const blockStart = resolvedPos.before(1);
            const node = editor.state.doc.nodeAt(blockStart);
            return node ? { blockStart, node } : null;
        } catch {
            return null;
        }
    }, [editor]);

    // ── Action Handlers ──
    const selectBlock = useCallback(() => {
        if (!hoveredBlock || !editor) return;
        const info = getBlockPos(hoveredBlock);
        if (!info) { editor.commands.focus(); return; }
        const { blockStart, node } = info;
        // For empty blocks, just place cursor inside; for blocks with content, select all
        if (node.textContent.length === 0) {
            editor.chain().focus().setTextSelection(blockStart + 1).run();
        } else {
            editor.chain().focus().setTextSelection({ from: blockStart + 1, to: blockStart + node.nodeSize - 1 }).run();
        }
    }, [hoveredBlock, editor, getBlockPos]);

    const handleAddBlock = useCallback(() => {
        if (!hoveredBlock || !editor) return;
        const info = getBlockPos(hoveredBlock);
        if (info) {
            const { blockStart, node } = info;
            const insertPos = blockStart + node.nodeSize;
            editor.chain().focus().insertContentAt(insertPos, { type: "paragraph" }).run();
        } else {
            // Fallback: just add a paragraph at the end
            editor.chain().focus().setTextSelection(editor.state.doc.content.size - 1).createParagraphNear().run();
        }
    }, [hoveredBlock, editor, getBlockPos]);

    const handleCopy = useCallback(() => {
        if (!hoveredBlock) return;
        navigator.clipboard.writeText(hoveredBlock.textContent || "");
        setMenuOpen(false);
        setSubMenu(null);
    }, [hoveredBlock]);

    const handleDuplicate = useCallback(() => {
        if (!hoveredBlock || !editor) return;
        const info = getBlockPos(hoveredBlock);
        if (info) {
            const { blockStart, node } = info;
            const insertPos = blockStart + node.nodeSize;
            editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
        }
        setMenuOpen(false);
        setSubMenu(null);
    }, [hoveredBlock, editor, getBlockPos]);

    const handleDelete = useCallback(() => {
        if (!hoveredBlock || !editor) return;
        const info = getBlockPos(hoveredBlock);
        if (info) {
            const { blockStart, node } = info;
            editor.chain().focus().deleteRange({ from: blockStart, to: blockStart + node.nodeSize }).run();
        }
        setMenuOpen(false);
        setSubMenu(null);
    }, [hoveredBlock, editor, getBlockPos]);

    const handleTurnInto = useCallback(({ command, args }) => {
        if (!editor) return;
        const pos = savedBlockPos.current;
        setMenuOpen(false);
        setSubMenu(null);
        setHandlePos(null);
        setHoveredBlock(null);

        setTimeout(() => {
            if (pos !== null) {
                // Use ProseMirror transaction directly — no focus/selection needed
                const { state, dispatch } = editor.view;
                const $pos = state.doc.resolve(pos);
                const blockStart = $pos.before($pos.depth || 1);
                const node = state.doc.nodeAt(blockStart);

                if (node) {
                    const schema = state.schema;
                    let tr;

                    if (command === "setHeading" && args?.level) {
                        tr = state.tr.setNodeMarkup(blockStart, schema.nodes.heading, { level: args.level });
                    } else if (command === "setParagraph") {
                        tr = state.tr.setNodeMarkup(blockStart, schema.nodes.paragraph);
                    } else {
                        // For toggles (lists, quotes, code), fall back to chain
                        editor.chain().focus().setTextSelection(pos)[command](args).run();
                        return;
                    }

                    dispatch(tr);
                    editor.view.focus();
                }
            }
        }, 50);
    }, [editor]);

    const handleTextColor = useCallback((color) => {
        if (!editor) return;
        selectBlock();
        if (color) {
            editor.chain().focus().setColor(color).run();
        } else {
            editor.chain().focus().unsetColor().run();
        }
        setMenuOpen(false);
        setSubMenu(null);
    }, [editor, selectBlock]);

    const handleBgColor = useCallback((color) => {
        if (!editor || !hoveredBlock) return;
        // shortcut: the colour is painted on the DOM node only, so it isn't saved with the page;
        // persisting it needs a Tiptap highlight/background mark.
        /* eslint-disable react-hooks/immutability -- hoveredBlock is a DOM element, not React data */
        if (color) {
            hoveredBlock.style.backgroundColor = color;
            hoveredBlock.style.borderRadius = "8px";
            hoveredBlock.style.padding = "4px 8px";
        } else {
            hoveredBlock.style.backgroundColor = "";
            hoveredBlock.style.borderRadius = "";
            hoveredBlock.style.padding = "";
        }
        /* eslint-enable react-hooks/immutability */
        setMenuOpen(false);
        setSubMenu(null);
    }, [editor, hoveredBlock]);

    if (!handlePos) return null;

    return (
        <div
            ref={containerRef}
            className="absolute flex items-center gap-0.5 z-40"
            style={{
                top: handlePos.top,
                left: -52,
                height: handlePos.firstLineHeight || 'auto',
            }}
            onMouseEnter={() => { handleHovered.current = true; }}
            onMouseLeave={(e) => {
                handleHovered.current = false;
                // Don't hide if moving back to the hover area or into the menu
                const related = e.relatedTarget;
                const wrapper = editor?.view?.dom?.closest('.novel-editor-wrapper');
                const hoverArea = wrapper?.parentElement || wrapper;
                if (hoverArea && hoverArea.contains(related)) return;
                if (menuRef.current && menuRef.current.contains(related)) return;
                if (!menuOpen) {
                    setHandlePos(null);
                    setHoveredBlock(null);
                }
            }}
        >
            {/* Plus button */}
            <button
                onClick={handleAddBlock}
                className="p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
                title="Add block below"
            >
                <Plus size={16} />
            </button>

            {/* Grip / Menu button */}
            <button
                onClick={() => {
                    // Save the block position before opening the menu
                    const info = getBlockPos(hoveredBlock);
                    savedBlockPos.current = info ? info.blockStart + 1 : null;
                    setMenuOpen(!menuOpen);
                    setSubMenu(null);
                }}
                className="p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-grab"
                title="Block menu"
            >
                <GripVertical size={16} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
                <div
                    ref={menuRef}
                    className="absolute left-0 top-8 w-56 bg-white rounded-xl border border-gray-200 shadow-2xl py-1 z-50 text-sm"
                >
                    {/* Turn Into */}
                    <div className="relative">
                        <button
                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                            onMouseEnter={() => setSubMenu("turnInto")}
                        >
                            <span className="flex items-center gap-2"><Type size={14} /> Turn into</span>
                            <ChevronRight size={14} className="text-gray-400" />
                        </button>
                        {subMenu === "turnInto" && (
                            <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-xl border border-gray-200 shadow-2xl py-1 z-50">
                                {TURN_INTO_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.label}
                                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => handleTurnInto(opt)}
                                    >
                                        <opt.icon size={14} className="text-gray-500" />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Color */}
                    <div className="relative">
                        <button
                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                            onMouseEnter={() => setSubMenu("color")}
                        >
                            <span className="flex items-center gap-2"><Palette size={14} /> Color</span>
                            <ChevronRight size={14} className="text-gray-400" />
                        </button>
                        {subMenu === "color" && (
                            <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-xl border border-gray-200 shadow-2xl py-1 z-50">
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Text Color</div>
                                {TEXT_COLORS.map((c) => (
                                    <button
                                        key={c.label + "-text"}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => handleTextColor(c.color)}
                                    >
                                        <span className="w-4 h-4 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: c.color || "#1a1a1a" }} />
                                        {c.label}
                                    </button>
                                ))}
                                <div className="border-t border-gray-100 my-1" />
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Background</div>
                                {BG_COLORS.map((c) => (
                                    <button
                                        key={c.label + "-bg"}
                                        className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => handleBgColor(c.color)}
                                    >
                                        <span className="w-4 h-4 rounded border border-gray-200 shrink-0" style={{ backgroundColor: c.color || "#ffffff" }} />
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 my-1" />

                    {/* Copy */}
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                        onClick={handleCopy}
                        onMouseEnter={() => setSubMenu(null)}
                    >
                        <Copy size={14} className="text-gray-500" /> Copy
                    </button>

                    {/* Duplicate */}
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                        onClick={handleDuplicate}
                        onMouseEnter={() => setSubMenu(null)}
                    >
                        <CopyPlus size={14} className="text-gray-500" /> Duplicate
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    {/* Delete */}
                    <button
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600 transition-colors"
                        onClick={handleDelete}
                        onMouseEnter={() => setSubMenu(null)}
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}
