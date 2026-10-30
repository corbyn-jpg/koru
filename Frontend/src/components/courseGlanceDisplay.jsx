import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AnnouncementsItem from "./UI/announcementsItem";
import NextClassItem from "./UI/nextClassItem";
import ToDoItem from "./UI/toDoItem";
import { getCourseAnnouncements, markAnnouncementAsRead } from "../services/announcementService";
import { getAllEvents } from "../services/eventService";

const MIN_LOADING_MS = 1500;

function SectionLabel({ children, className = "" }) {
    return (
        <p className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${className}`}>
            {children}
        </p>
    );
}

function NextClassSkeleton() {
    return (
        <div className="my-2 rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/3" />
                <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
            </div>
        </div>
    );
}

function AnnouncementSkeleton() {
    return (
        <div className="my-2 rounded-xl border border-gray-200 w-full flex flex-row items-center px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1 ml-3 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
            </div>
            <div className="ml-3 shrink-0 w-8 h-2.5 bg-gray-100 rounded-full animate-pulse" />
        </div>
    );
}

export default function CourseGlanceDisplay({ activeCourseId }) {
    const [announcements, setAnnouncements] = useState([]);
    const [nextClass, setNextClass] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        async function fetchData() {
            if (!activeCourseId) {
                if (mounted) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const [annData, evtData] = await Promise.all([
                    getCourseAnnouncements(activeCourseId, user?.userId).catch(() => []),
                    getAllEvents().catch(() => []),
                    new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
                ]);

                if (!mounted) return;

                setAnnouncements(Array.isArray(annData) ? annData.slice(0, 2) : []);

                const now = new Date();
                const futureEvents = (Array.isArray(evtData) ? evtData : [])
                    .filter(e => {
                        if (e.courseId !== activeCourseId) return false;
                        if (new Date(e.startTime) <= now) return false;
                        const type = e.eventType?.toLowerCase() || "";
                        return type === "class" || type === "lecture" || type === "practical";
                    })
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                if (futureEvents.length > 0) {
                    const next = futureEvents[0];
                    const start = new Date(next.startTime);
                    const end = new Date(next.endTime);
                    let room = "TBA";
                    if (next.description && next.description.includes("|")) {
                        room = next.description.split("|")[1] || "TBA";
                    }
                    setNextClass({
                        subject: next.title || "Class",
                        date: start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
                        time: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`,
                        room,
                    });
                } else {
                    setNextClass(null);
                }
            } catch (err) {
                console.error("Failed to fetch data for glance:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchData();
        return () => { mounted = false; };
    }, [activeCourseId, user?.userId]);

    return (
        <div className="w-full h-fit rounded-2xl mt-4">
            <SectionLabel>To Do</SectionLabel>
            <ToDoItem activeCourseId={activeCourseId} />

            <SectionLabel className="mt-5">Next Class</SectionLabel>
            {loading ? (
                <NextClassSkeleton />
            ) : nextClass ? (
                <NextClassItem subject={nextClass.subject} date={nextClass.date} time={nextClass.time} room={nextClass.room} />
            ) : (
                <p className="text-xs text-gray-400 py-2">No upcoming classes scheduled</p>
            )}

            <SectionLabel className="mt-5">Announcements</SectionLabel>
            {loading ? (
                <>{[1, 2].map(i => <AnnouncementSkeleton key={i} />)}</>
            ) : announcements.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No recent announcements</p>
            ) : (
                announcements.map(a => (
                    <AnnouncementsItem
                        key={a.id}
                        title={a.title}
                        message={a.preview}
                        time={new Date(a.datePosted).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        isRead={a.isRead}
                        color={a.color || "#3C0078"}
                        onClick={async () => {
                            try {
                                if (user?.userId && !a.isRead) {
                                    await markAnnouncementAsRead(a.id, user.userId);
                                }
                            } catch (err) {
                                console.error("Failed to mark announcement as read:", err);
                            }
                            navigate(`/courses/${activeCourseId}/announcements`);
                        }}
                    />
                ))
            )}
        </div>
    );
}
