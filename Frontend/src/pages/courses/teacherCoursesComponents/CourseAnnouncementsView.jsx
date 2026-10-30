import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Bell, CloseSquare, User } from "@solar-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, slideUp } from "./constants";
import {
    getCourseAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
} from "../../../services/announcementService";
import { useAuth } from "../../../contexts/AuthContext";

export function CourseAnnouncementsView({ activeCourseId }) {
    const { user } = useAuth();
    const [selectedId, setSelectedId] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [posting, setPosting] = useState(false);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        preview: "",
    });

    useEffect(() => {
        let mounted = true;
        async function fetchAnnouncements() {
            if (!activeCourseId) return;
            try {
                setLoading(true);
                const data = await getCourseAnnouncements(activeCourseId);
                if (mounted) setAnnouncements(data || []);
            } catch (err) {
                console.error("Failed to load announcements:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchAnnouncements();
        return () => { mounted = false; };
    }, [activeCourseId]);

    const selectedAnnouncement = announcements.find(a => a.id === selectedId);

    const handlePost = async () => {
        if (!newAnnouncement.title || !newAnnouncement.preview) return;
        setPosting(true);
        try {
            const payload = {
                ...newAnnouncement,
                courseId: activeCourseId,
                lecturerName: user?.name || user?.fullName || "Lecturer",
            };
            const created = await createAnnouncement(payload);
            setAnnouncements(prev => [created, ...prev]);
            setIsAdding(false);
            setNewAnnouncement({ title: "", preview: "" });
        } catch (err) {
            console.error("Failed to post announcement:", err);
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        try {
            await deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            if (selectedId === id) setSelectedId(null);
        } catch (err) {
            console.error("Failed to delete announcement:", err);
        }
    };

    return (
        <motion.div className="flex-1 flex flex-col overflow-hidden h-full" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Announcements</h1>
                    <p className="text-gray-500 mt-2">Manage and post updates for your students</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-brand text-white px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand/20 self-start sm:self-auto"
                    >
                        <Plus size={16} />
                        Create Announcement
                    </button>
                )}
            </motion.header>

            {/* Create form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, y: -16, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -16, height: 0, transition: { duration: 0.18, ease: "easeIn" } }}
                        className="bg-white p-6 rounded-3xl border-2 border-dashed border-brand/20 shadow-sm mb-6 overflow-hidden shrink-0"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 italic">Drafting New Announcement</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                <CloseSquare size={22} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-6 mb-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Announcement Title</label>
                                <input
                                    type="text"
                                    placeholder="What's the update about?"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-gray-900 font-medium focus:ring-2 focus:ring-brand/20 transition"
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Announcement Message</label>
                                <textarea
                                    rows={5}
                                    placeholder="Write your announcement details here..."
                                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-brand/20 transition resize-none leading-relaxed"
                                    value={newAnnouncement.preview}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, preview: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={handlePost}
                                disabled={posting}
                                className="bg-brand text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-brand-deep transition shadow-lg shadow-brand/20 disabled:opacity-50"
                            >
                                {posting ? "Posting…" : "Post Announcement"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Split layout */}
            <div className="flex-1 flex flex-row gap-6 min-h-0 overflow-hidden relative">
                {/* Left list */}
                <div
                    className={`${
                        selectedId ? "hidden lg:flex" : "flex"
                    } flex-col gap-4 overflow-y-auto pr-2 transition duration-300 ${
                        selectedId ? "w-full lg:w-[45%] lg:shrink-0" : "w-full"
                    }`}
                >
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="p-5 rounded-2xl border border-gray-200 bg-white animate-pulse flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-full" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : announcements.map((post) => (
                        <motion.div
                            key={post.id}
                            onClick={() => setSelectedId(post.id)}
                            variants={slideUp}
                            className={`p-5 rounded-2xl border transition cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 group shrink-0 ${
                                selectedId === post.id
                                    ? "bg-brand/5 border-brand/30 shadow-md"
                                    : "bg-white border-gray-200 shadow-sm hover:shadow-md"
                            }`}
                        >
                            <div className="flex flex-1 items-start gap-4 pl-2 min-w-0">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{
                                        backgroundColor: selectedId === post.id ? "#3C007820" : "#3C007815",
                                        color: "#3C0078"
                                    }}
                                >
                                    <Bell size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-gray-800 leading-snug group-hover:text-brand transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-1 mt-0.5">
                                        {post.preview}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-brand mt-1.5 opacity-70">
                                        Posted by {post.lecturerName || post.lecturer?.name || post.lecturer || "Lecturer"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex md:flex-col items-center md:items-end justify-end gap-2 pl-6 md:pl-0 shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                                <span className="text-xs text-gray-400 font-semibold">
                                    {post.datePosted
                                        ? new Date(post.datePosted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                        : (post.date || "")}
                                </span>
                                <button
                                    onClick={e => handleDelete(post.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition"
                                    title="Delete announcement"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right detail panel */}
                <AnimatePresence mode="wait">
                    {selectedId && selectedAnnouncement && (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, transition: { duration: 0.15, ease: "easeIn" } }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className="flex-1 w-full lg:w-[55%] bg-white border border-gray-200 rounded-3xl p-8 flex flex-col shadow-sm overflow-y-auto"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-sm font-medium text-gray-400">
                                    {selectedAnnouncement.datePosted
                                        ? new Date(selectedAnnouncement.datePosted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                        : (selectedAnnouncement.date || "")}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDelete(selectedId)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Delete announcement"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedId(null)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                    >
                                        <CloseSquare size={22} />
                                    </button>
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-gray-900 leading-tight mb-4">
                                {selectedAnnouncement.title}
                            </h2>

                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-brand">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Published By</p>
                                    <p className="font-bold text-brand">
                                        {selectedAnnouncement.lecturerName || selectedAnnouncement.lecturer?.name || selectedAnnouncement.lecturer || "Lecturer"}
                                    </p>
                                </div>
                            </div>

                            <div className="prose prose-purple max-w-none flex-1">
                                <p className="text-lg leading-relaxed text-gray-600 mb-6 font-medium">
                                    {selectedAnnouncement.preview}
                                </p>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                    Please make sure to check the attached documents in the resources section if any are mentioned. If you have any follow-up questions regarding this announcement, feel free to reach out during office hours or through the discussion forum.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
