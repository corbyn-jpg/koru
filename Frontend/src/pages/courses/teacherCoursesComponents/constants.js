import { FileText, HelpCircle, MessageSquare, Users, ExternalLink, ClipboardList } from "lucide-react";

export const ANNOUNCEMENTS_DATA = [
    {
        id: 1,
        title: "Project 3 Brief Released",
        lecturer: "Dr. Sarah Miller",
        date: "Today, 10:45 AM",
        preview: "The brief for Project 3: High-Fidelity Prototyping is now available in the Modules section. Please review the technical requirements before Monday's lecture.",
        label: "Notice",
        color: "#3C0078"
    },
    {
        id: 2,
        title: "Guest Lecture: Industry UX Trends",
        lecturer: "Prof. Mark Chen",
        date: "Yesterday, 2:15 PM",
        preview: "We have an exciting guest speaker from a leading fintech startup joining us next week Tuesday. Attendance is mandatory for UX300 students.",
        label: "Event",
        color: "#FF8731"
    },
    {
        id: 3,
        title: "Lab Room Change - Block D",
        lecturer: "Admin",
        date: "18 Apr 2026",
        preview: "The practical session for Friday will be moved to Lab 402 in Block D due to maintenance in the main studio.",
        label: "Update",
        color: "#87CEFA"
    }
];

export const ATTENDANCE_STATS = [
    { label: "Total Sessions", value: "42", color: "#3C0078" },
    { label: "Attended", value: "38", color: "#87CEFA" },
    { label: "Missed", value: "4", color: "#FF8731" },
    { label: "Percentage", value: "90%", variant: "large" },
];

export const ATTENDANCE_LOGS = [
    { date: "18 Apr 2026", type: "Lecture", status: "Present", time: "10:00 AM" },
    { date: "15 Apr 2026", type: "Tutorial", status: "Present", time: "14:00 PM" },
    { date: "11 Apr 2026", type: "Lecture", status: "Absent", time: "10:00 AM" },
    { date: "08 Apr 2026", type: "Practical", status: "Present", time: "11:30 AM" },
];

export const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export const ASSIGNMENT_TYPES = [
    {
        id: "online",
        label: "Online Submission",
        icon: FileText,
        color: "#3C0078",
        bg: "bg-brand/10",
        description: "File uploads, text entry, URLs, or media recordings submitted directly through the platform.",
    },
    {
        id: "quiz",
        label: "Quiz",
        icon: HelpCircle,
        color: "#FF8731",
        bg: "bg-ember/10",
        description: "Multiple choice, essay, and matching questions with automatic or manual grading.",
    },
    {
        id: "external",
        label: "External Tool (LTI)",
        icon: ExternalLink,
        color: "#6366F1",
        bg: "bg-[#6366F1]/10",
        description: "Integrates Turnitin, Google Assignments, Microsoft 365, and other outside platforms.",
    },
];

export const ASSIGNMENT_GROUPS_DATA = [
    {
        id: "g1",
        name: "Projects",
        weight: 40,
        assignments: [
            { id: "a1", title: "Project 1: Research & Discovery", type: "online", points: 100, gradeDisplay: "Percentage", dueDate: "2026-03-12", availableFrom: "2026-02-28", availableUntil: "2026-03-15", assignedTo: "Everyone", published: true, submissions: 22, totalStudents: 26 },
            { id: "a2", title: "Project 2: Wireframes & Prototyping", type: "online", points: 150, gradeDisplay: "Points", dueDate: "2026-04-05", availableFrom: "2026-03-20", availableUntil: "2026-04-08", assignedTo: "Everyone", published: true, submissions: 19, totalStudents: 26 },
        ],
    },
    {
        id: "g2",
        name: "Quizzes",
        weight: 20,
        assignments: [
            { id: "a3", title: "Mid-Term Knowledge Check", type: "quiz", points: 50, gradeDisplay: "Percentage", dueDate: "2026-04-15", availableFrom: "2026-04-15", availableUntil: "2026-04-15", assignedTo: "Everyone", published: true, submissions: 25, totalStudents: 26 },
            { id: "a4", title: "UX Principles Quick Quiz", type: "quiz", points: 30, gradeDisplay: "Points", dueDate: "2026-05-02", availableFrom: "2026-05-02", availableUntil: "2026-05-02", assignedTo: "Everyone", published: false, submissions: 0, totalStudents: 26 },
        ],
    },
    {
        id: "g3",
        name: "Discussions",
        weight: 15,
        assignments: [
            { id: "a5", title: "Week 3: Accessible Design Forum", type: "discussion", points: 20, gradeDisplay: "Complete/Incomplete", dueDate: "2026-03-22", availableFrom: "2026-03-18", availableUntil: "2026-03-24", assignedTo: "Everyone", published: true, submissions: 24, totalStudents: 26 },
        ],
    },
    {
        id: "g4",
        name: "Peer Reviews",
        weight: 10,
        assignments: [
            { id: "a6", title: "Peer Review: Prototype Critique", type: "peer", points: 25, gradeDisplay: "Points", dueDate: "2026-04-20", availableFrom: "2026-04-18", availableUntil: "2026-04-22", assignedTo: "Everyone", published: false, submissions: 0, totalStudents: 26 },
        ],
    },
    {
        id: "g5",
        name: "Exams",
        weight: 15,
        assignments: [
            { id: "a7", title: "Final Case Study Delivery", type: "online", points: 200, gradeDisplay: "Percentage", dueDate: "2026-06-10", availableFrom: "2026-06-01", availableUntil: "2026-06-12", assignedTo: "Everyone", published: false, submissions: 0, totalStudents: 26 },
        ],
    },
];

export const GRADE_DISPLAY_OPTIONS = ["Percentage", "Points", "Letter Grade", "Complete/Incomplete", "GPA Scale", "Not Graded"];
export const SUBMISSION_TYPE_OPTIONS = ["Online", "On Paper", "External Tool", "No Submission"];
export const ASSIGN_TO_OPTIONS = ["Everyone", "Specific Section", "Individual Students"];

export const EXTERNAL_TOOLS = [
    {
        id: "google",
        name: "Google Assignments",
        icon: "G",
        color: "#4285F4",
        bg: "bg-[#4285F4]/10",
        baseUrl: "https://assignments.google.com",
    },
    {
        id: "microsoft",
        name: "Microsoft Teams",
        icon: "M",
        color: "#0078D4",
        bg: "bg-[#0078D4]/10",
        baseUrl: "https://teams.microsoft.com",
    },
    {
        id: "turnitin",
        name: "Turnitin",
        icon: "T",
        color: "#E63946",
        bg: "bg-[#E63946]/10",
        baseUrl: "https://www.turnitin.com",
    },
];

export const STUDENT_GRADES_DATA = [
    { id: 1, name: "Alice Johnson", email: "alice.j@student.ac.za", attendance: "95%", avgGrade: "88%", status: "Good", avatar: "AJ" },
    { id: 2, name: "Bob Smith", email: "bob.s@student.ac.za", attendance: "82%", avgGrade: "74%", status: "At Risk", avatar: "BS" },
    { id: 3, name: "Charlie Davis", email: "charlie.d@student.ac.za", attendance: "91%", avgGrade: "92%", status: "Excellent", avatar: "CD" },
    { id: 4, name: "Diana Prince", email: "diana.p@student.ac.za", attendance: "98%", avgGrade: "85%", status: "Good", avatar: "DP" },
    { id: 5, name: "Ethan Hunt", email: "ethan.h@student.ac.za", attendance: "65%", avgGrade: "58%", status: "Critical", avatar: "EH" },
    { id: 6, name: "Fiona Apple", email: "fiona.a@student.ac.za", attendance: "89%", avgGrade: "79%", status: "Good", avatar: "FA" },
];
