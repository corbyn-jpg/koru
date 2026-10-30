import React, { useState, useEffect } from "react";
import { Bell, CloseSquare, User } from "@solar-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, slideUp } from "./constants";
import { getCourseAnnouncements, markAnnouncementAsRead, markAllAnnouncementsAsRead } from "../../../services/announcementService";
import { useAuth } from "../../../contexts/AuthContext";

export default function CourseAnnouncementsView({ activeCourseId }) {
    const [selectedId, setSelectedId] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;
        async function fetchAnnouncements() {
            if (!activeCourseId) return;
            try {
                setLoading(true);
                const data = await getCourseAnnouncements(activeCourseId, user?.userId);
                if (mounted) setAnnouncements(data || []);
            } catch (err) {
                console.error("Failed to load announcements:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchAnnouncements();
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    const selectedAnnouncement = announcements.find(a => a.id === selectedId);

    const handleSelectAnnouncement = async (post) => {
        setSelectedId(post.id);
        if (user?.userId && !post.isRead) {
            // Optimistic local state update
            setAnnouncements(prev => prev.map(a => a.id === post.id ? { ...a, isRead: true } : a));
            try {
                await markAnnouncementAsRead(post.id, user.userId);
            } catch (err) {
                console.error("Failed to mark announcement as read:", err);
            }
        }
    };

    const handleMarkAllRead = async () => {
        if (!activeCourseId || !user?.userId) return;
        // Optimistic local state update
        setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
        try {
            await markAllAnnouncementsAsRead(activeCourseId, user.userId);
        } catch (err) {
            console.error("Failed to mark all announcements as read:", err);
        }
    };

    return (
        <motion.div className="flex-1 flex flex-col overflow-hidden h-full" initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.header variants={slideUp} className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Announcements</h1>
                    <p className="text-gray-500 mt-2">Latest updates from your lecturers</p>
                </div>
                {announcements.some(a => !a.isRead) && (
                    <button
                        onClick={handleMarkAllRead}
                        className="px-6 py-2.5 rounded-2xl bg-brand/5 text-brand font-bold text-xs uppercase tracking-wider hover:bg-brand hover:text-white transition self-start sm:self-auto"
                    >
                        Mark All as Read
                    </button>
                )}
            </motion.header>

            {/* Split layout container */}
            <div className="flex-1 flex flex-row gap-6 min-h-0 overflow-hidden relative">
                {/* Left Column: List (Shrinks when an item is selected) */}
                <div 
                    className={`${
                        selectedId ? "hidden lg:flex" : "flex"
                    } flex-col gap-4 overflow-y-auto pr-2 transition duration-300 ${
                        selectedId ? "w-full lg:w-[45%] lg:shrink-0" : "w-full"
                    }`}
                >
                    {loading ? (
                        <div className="flex flex-col gap-4 w-full animate-pulse">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 pl-2">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0 mt-0.5" />
                                        <div className="flex-1 flex flex-col gap-2.5">
                                            <div className="h-5 rounded-full bg-gray-200" style={{ width: `${45 + (i * 17) % 35}%` }} />
                                            <div className="h-3 rounded-full bg-gray-100 w-4/5" />
                                            <div className="h-2.5 rounded-full bg-gray-100 w-32 mt-0.5" />
                                        </div>
                                    </div>
                                    <div className="h-3 rounded-full bg-gray-100 w-20 shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="flex items-center justify-center w-full h-48 text-gray-400 text-sm font-medium bg-white rounded-3xl border border-gray-100">
                            No announcements yet.
                        </div>
                    ) : announcements.map((post) => (
                        <motion.div
                            key={post.id}
                            onClick={() => handleSelectAnnouncement(post)}
                            variants={slideUp}
                            className={`p-5 rounded-2xl border transition cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 group shrink-0 ${
                                selectedId === post.id 
                                    ? "bg-brand/5 border-brand/30 shadow-md" 
                                    : "bg-white border-gray-100 shadow-sm hover:shadow-md"
                            }`}
                        >

                            {/* Left & Middle detail content */}
                            <div className="flex flex-1 items-start gap-4 pl-2 min-w-0">
                                {/* Icon avatar */}
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ 
                                        backgroundColor: selectedId === post.id ? "#3C007820" : "#3C007815", 
                                        color: "#3C0078" 
                                    }}
                                >
                                    <Bell size={20} />
                                </div>

                                {/* Title, author, preview */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h2 className={`text-lg leading-snug group-hover:text-brand transition-colors ${!post.isRead ? "font-extrabold text-black" : "font-bold text-gray-800"}`}>
                                            {post.title}
                                        </h2>
                                        {!post.isRead && (
                                            <span className="flex h-2.5 w-2.5 shrink-0 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-brand"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-1">
                                        {post.preview}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-brand mt-1.5 opacity-70">
                                        Posted by {post.lecturerName || post.lecturer?.name || post.lecturer || "Lecturer"}
                                    </p>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="shrink-0 pl-6 md:pl-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-50 self-stretch md:self-auto flex md:flex-col items-center md:items-end justify-end">
                                <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">
                                    {post.datePosted
                                        ? new Date(post.datePosted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                        : (post.date || "")}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right Column: Detail Panel */}
                <AnimatePresence mode="wait">
                    {selectedId && selectedAnnouncement && (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, transition: { duration: 0.15, ease: "easeIn" } }}
                            transition={{ type: "spring", damping: 30, stiffness: 250 }}
                            className={`${
                                selectedId ? "flex" : "hidden lg:flex"
                            } flex-1 w-full lg:w-[55%] bg-white border border-gray-100 rounded-3xl p-8 flex flex-col shadow-sm overflow-y-auto`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-medium text-gray-400">
                                    {selectedAnnouncement.datePosted
                                        ? new Date(selectedAnnouncement.datePosted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                        : (selectedAnnouncement.date || "")}
                                </span>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                >
                                    <CloseSquare size={22} />
                                </button>
                            </div>

                            <h2 className="text-3xl font-black text-gray-900 leading-tight mb-4">
                                {selectedAnnouncement.title}
                            </h2>

                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-brand">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Published By</p>
                                    <p className="font-bold text-brand">{selectedAnnouncement.lecturerName || selectedAnnouncement.lecturer?.name || selectedAnnouncement.lecturer || "Lecturer"}</p>
                                </div>
                            </div>

                            <div className="prose prose-purple max-w-none flex-1">
                                <p className="text-lg leading-relaxed text-gray-600 mb-6 font-medium">
                                    {selectedAnnouncement.preview}
                                </p>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                    Please make sure to check the attached documents in the resources section if any are mentioned. If you have any follow-up questions regarding this announcement, feel free to reach out to the lecturer during office hours or post in the discussion forum.
                                </p>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
