import React from "react";
import { Plus, X, Eye, EyeOff, Edit2, Trash2, ChevronDown, ChevronRight, FileText, HelpCircle, MessageSquare, Users, ExternalLink, ClipboardList, Check, Loader, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCourseAssignments, createAssignment, updateAssignment, deleteAssignment, closeAssignment } from "../../../services/assignmentService";
import { getAssignmentGrades, createGrade, updateGrade, releaseAssignmentGrades } from "../../../services/gradeService";
import { getCourseSubmissions, getAssignmentSubmissions, updateSubmission } from "../../../services/submissionService";
import { getCourseStudentCount } from "../../../services/enrollmentService";
import { getCourseCohorts, getCourseStudents } from "../../../services/classGroupService";
import { useAuth } from "../../../contexts/AuthContext";
import CohortFilterBar from "../../../components/CohortFilterBar";
import { staggerContainer, slideUp, ASSIGNMENT_TYPES, GRADE_DISPLAY_OPTIONS, EXTERNAL_TOOLS } from "./constants";

function AssignmentTypeIcon({ type, size = 18 }) {
    const found = ASSIGNMENT_TYPES.find(t => t.id === type);
    if (!found) return null;
    const Icon = found.icon;
    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${found.bg}`} title={found.label}>
            <Icon size={size} style={{ color: found.color }} />
        </span>
    );
}

function CreateAssignmentDrawer({ onClose, onSave, initialData, cohorts = [], defaultGroupId = null }) {
    const isEditing = !!initialData;
    const [form, setForm] = React.useState({
        title: initialData?.title ?? "",
        description: initialData?.description ?? "",
        type: initialData?.type ?? "online",
        points: initialData?.maxPoints ?? initialData?.points ?? 100,
        gradeDisplay: initialData?.gradeDisplay ?? "Percentage",
        openDate: initialData?.openDate ? new Date(initialData.openDate).toISOString().slice(0,16) : "",
        closeDate: initialData?.closeDate ? new Date(initialData.closeDate).toISOString().slice(0,16) : "",
        dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0,16) : "",
        allowMultipleAttempts: initialData?.allowMultipleAttempts ?? true,
        externalToolName: initialData?.externalToolName ?? "",
        externalToolUrl: initialData?.externalToolUrl ?? "",
        id: initialData?.id ?? null,
        submissions: initialData?.submissions ?? 0,
        totalStudents: initialData?.totalStudents ?? 0,
        classGroupId: initialData?.classGroupId ?? defaultGroupId ?? null,
    });

    const parseInitialQuestions = () => {
        if (!initialData?.quizQuestionsJson) return [];
        try { return JSON.parse(initialData.quizQuestionsJson); } catch { return []; }
    };
    const [quizQuestions, setQuizQuestions] = React.useState(parseInitialQuestions);

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const addQuestion = () => setQuizQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    const removeQuestion = (qi) => setQuizQuestions(prev => prev.filter((_, i) => i !== qi));
    const updateQuestion = (qi, field, value) => setQuizQuestions(prev => prev.map((q, i) => i !== qi ? q : { ...q, [field]: value }));
    const updateOption = (qi, oi, value) => setQuizQuestions(prev => prev.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j !== oi ? o : value) }));

    const handleSubmit = () => {
        if (!form.title.trim()) return;
        const payload = {
            ...form,
            maxPoints: form.points,
            classGroupId: form.classGroupId || null,
            quizQuestionsJson: form.type === "quiz" && quizQuestions.length > 0 ? JSON.stringify(quizQuestions) : null,
            externalToolName: form.type === "external" ? (form.externalToolName || null) : null,
            externalToolUrl: form.type === "external" ? (form.externalToolUrl || null) : null,
        };
        onSave(payload);
    };

    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="w-full max-w-xl bg-white border border-gray-200 rounded-[32px] shadow-sm flex flex-col overflow-hidden h-full shrink-0"
        >
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{isEditing ? "Edit Assignment" : "Create Assignment"}</h2>
                    <p className="text-sm text-gray-400 mt-1">Fill in the details below</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                    <X size={22} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    {cohorts.length > 0 && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Assign To</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleChange("classGroupId", null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                        form.classGroupId === null
                                            ? "bg-brand text-white border-brand"
                                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    All Groups
                                </button>
                                {cohorts.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleChange("classGroupId", c.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                                            form.classGroupId === c.id
                                                ? "bg-brand text-white border-brand"
                                                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Assignment Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ASSIGNMENT_TYPES.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => handleChange("type", t.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 text-center transition ${
                                            form.type === t.id ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-200 bg-gray-50"
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${t.bg}`}>
                                            <Icon size={18} style={{ color: t.color }} />
                                        </span>
                                        <span className={`text-[10px] font-bold leading-tight ${form.type === t.id ? "text-brand" : "text-gray-500"}`}>
                                            {t.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Title</label>
                        <input
                            type="text"
                            placeholder="Assignment title..."
                            value={form.title}
                            onChange={e => handleChange("title", e.target.value)}
                            className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-transparent transition"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Instructions / Description</label>
                        <textarea
                            rows={4}
                            placeholder="Write the assignment instructions here..."
                            value={form.description}
                            onChange={e => handleChange("description", e.target.value)}
                            className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 border border-transparent transition resize-none leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Points</label>
                            <input
                                type="number"
                                min={0}
                                value={form.points}
                                onChange={e => handleChange("points", parseInt(e.target.value) || 0)}
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Grade Display</label>
                            <select
                                value={form.gradeDisplay}
                                onChange={e => handleChange("gradeDisplay", e.target.value)}
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-transparent transition appearance-none"
                            >
                                {GRADE_DISPLAY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Allow Multiple Attempts</p>
                            <p className="text-xs text-gray-500 mt-0.5">Students can resubmit until closed</p>
                        </div>
                        <button
                            onClick={() => handleChange("allowMultipleAttempts", !form.allowMultipleAttempts)}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.allowMultipleAttempts ? "bg-brand" : "bg-gray-300"}`}
                        >
                            <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.allowMultipleAttempts ? "translate-x-6" : "translate-x-0"}`} />
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Dates</label>
                        <div className="bg-gray-50 rounded-[28px] p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Opens</label>
                                <input type="datetime-local" value={form.openDate} onChange={e => handleChange("openDate", e.target.value)} className="w-full bg-white rounded-2xl px-5 py-3 text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-gray-200 transition" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Due Date</label>
                                <input type="datetime-local" value={form.dueDate} onChange={e => handleChange("dueDate", e.target.value)} className="w-full bg-white rounded-2xl px-5 py-3 text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-gray-200 transition" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Closes</label>
                                <input type="datetime-local" value={form.closeDate} onChange={e => handleChange("closeDate", e.target.value)} className="w-full bg-white rounded-2xl px-5 py-3 text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 border border-gray-200 transition" />
                            </div>
                        </div>
                    </div>

                    {form.type === "external" && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">External Tool</label>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {EXTERNAL_TOOLS.map(tool => (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => {
                                            handleChange("externalToolName", tool.name);
                                            if (!form.externalToolUrl) handleChange("externalToolUrl", tool.baseUrl);
                                        }}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${
                                            form.externalToolName === tool.name
                                                ? "border-[#6366F1] bg-[#6366F1]/5"
                                                : "border-gray-200 hover:border-gray-200 bg-gray-50"
                                        }`}
                                    >
                                        <span
                                            className={`w-10 h-10 rounded-xl ${tool.bg} flex items-center justify-center text-base font-black shrink-0`}
                                            style={{ color: tool.color }}
                                        >
                                            {tool.icon}
                                        </span>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-bold leading-tight truncate ${
                                                form.externalToolName === tool.name ? "text-[#6366F1]" : "text-gray-700"
                                            }`}>{tool.name}</p>
                                            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{tool.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Tool URL / Launch Link</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={form.externalToolUrl}
                                onChange={e => handleChange("externalToolUrl", e.target.value)}
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 border border-transparent transition"
                            />
                        </div>
                    )}

                    {form.type === "quiz" && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Quiz Questions</label>
                                <button onClick={addQuestion} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ember/10 text-ember font-bold text-[10px] uppercase tracking-wider hover:bg-ember/20 transition">
                                    <Plus size={14} /> Add Question
                                </button>
                            </div>
                            {quizQuestions.length === 0 && (
                                <p className="text-xs text-gray-400 bg-gray-50 rounded-2xl px-5 py-4">No questions yet. Click "Add Question" to begin.</p>
                            )}
                            <div className="space-y-4">
                                {quizQuestions.map((q, qi) => (
                                    <div key={qi} className="bg-gray-50 rounded-[24px] p-5 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className="w-6 h-6 rounded-full bg-ember/20 text-ember text-[10px] font-black flex items-center justify-center shrink-0 mt-1">{qi + 1}</span>
                                            <input
                                                type="text"
                                                placeholder="Question text..."
                                                value={q.question}
                                                onChange={e => updateQuestion(qi, "question", e.target.value)}
                                                className="flex-1 bg-white rounded-xl px-4 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-ember/20 border border-gray-200"
                                            />
                                            <button onClick={() => removeQuestion(qi)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="space-y-2 pl-9">
                                            {q.options.map((opt, oi) => (
                                                <div key={oi} className="flex items-center gap-2">
                                                    <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi} onChange={() => updateQuestion(qi, "correctAnswer", oi)} className="accent-brand" />
                                                    <input
                                                        type="text"
                                                        placeholder={`Option ${oi + 1}...`}
                                                        value={opt}
                                                        onChange={e => updateOption(qi, oi, e.target.value)}
                                                        className="flex-1 bg-white rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/10 border border-gray-200"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-gray-400 pl-9">Select the radio button next to the correct answer</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 border-t border-gray-200 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-4 rounded-2xl bg-brand text-white font-bold text-xs uppercase tracking-wider hover:bg-brand-deep transition shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                    >
                        <Eye size={16} /> {isEditing ? "Save Changes" : "Publish"}
                    </button>
                </div>
        </motion.div>
    );
}

function SubmissionFileViewer({ submission }) {
    const [blobUrl, setBlobUrl] = React.useState(null);
    const [fileError, setFileError] = React.useState(false);
    const [fileLoading, setFileLoading] = React.useState(true);
    const fileUrl = submission?.fileUrl || "";

    const fileExt = React.useMemo(() => {
        try {
            const path = fileUrl.startsWith("http") ? new URL(fileUrl).pathname : fileUrl;
            return path.split(".").pop()?.toLowerCase() || "";
        } catch { return ""; }
    }, [fileUrl]);

    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileExt);
    const isPdf = fileExt === "pdf";
    const isVideo = ["mp4", "mov", "webm"].includes(fileExt);
    const isAudio = ["mp3", "wav", "ogg"].includes(fileExt);

    React.useEffect(() => {
        if (!fileUrl) { setFileLoading(false); return; }
        let revoke = null;

        if (fileUrl.startsWith("http")) {
            if (isImage) {
                setBlobUrl(fileUrl);
                setFileLoading(false);
                return;
            }
        }

        const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";
        setFileLoading(true);
        setFileError(false);
        fetch(`${API_BASE}/Submission/${submission.id}/file`)
            .then(res => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                revoke = url;
                setBlobUrl(url);
            })
            .catch(() => {
                if (fileUrl.startsWith("http")) {
                    setBlobUrl(fileUrl);
                } else {
                    setFileError(true);
                }
            })
            .finally(() => setFileLoading(false));

        return () => { if (revoke) URL.revokeObjectURL(revoke); };
    }, [submission.id, fileUrl, isImage, isPdf]);

    if (!fileUrl) return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-3xl border border-gray-200 text-gray-400 text-sm font-medium">
            No file submitted
        </div>
    );

    if (fileLoading) return (
        <div className="h-64 rounded-3xl bg-gray-100 animate-pulse border border-gray-200" />
    );

    if (fileError) return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-3xl border border-gray-200 gap-3">
            <FileText size={28} className="text-gray-300" />
            <p className="text-sm text-gray-400 font-medium">Unable to load file preview</p>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand font-bold hover:underline">Try opening directly</a>
        </div>
    );

    if (isPdf) return (
        <iframe src={blobUrl} className="w-full h-[600px] rounded-3xl border border-gray-200" title="Submission PDF" />
    );
    if (isImage) return (
        <div className="flex items-center justify-center bg-gray-50 rounded-3xl border border-gray-200 p-4 min-h-[300px]">
            <img src={blobUrl} alt="Submission" className="max-w-full max-h-[550px] rounded-2xl object-contain" />
        </div>
    );
    if (isVideo) return (
        <video src={blobUrl} controls className="w-full rounded-3xl border border-gray-200 max-h-[500px]" />
    );
    if (isAudio) return (
        <div className="flex items-center justify-center bg-gray-50 rounded-3xl border border-gray-200 p-8">
            <audio src={blobUrl} controls className="w-full" />
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-3xl border border-gray-200 gap-3">
            <FileText size={28} className="text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">{fileExt.toUpperCase()} file</p>
            <a href={blobUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-brand/5 text-brand text-xs font-bold hover:bg-brand/10 transition-colors">
                Download File
            </a>
        </div>
    );
}

function TeacherSubmissionReview({
    assignment,
    onBack,
    cohorts = [],
    studentCohortMap = {},
    selectedCohortId: initialCohortId = null,
    onCohortChange
}) {
    const { user } = useAuth();
    const [submissions, setSubmissions] = React.useState([]);
    const [grades, setGrades] = React.useState({});
    const [selectedCohortId, setSelectedCohortId] = React.useState(initialCohortId);

    const handleCohortChange = (id) => {
        setSelectedCohortId(id);
        onCohortChange?.(id);
    };
    const [loading, setLoading] = React.useState(true);
    const [gradingState, setGradingState] = React.useState({});
    const [releasing, setReleasing] = React.useState(false);
    const [selectedSub, setSelectedSub] = React.useState(null);

    async function handleRelease() {
        setReleasing(true);
        try {
            await releaseAssignmentGrades(assignment.id);
            setGrades(prev => {
                const updated = {};
                Object.keys(prev).forEach(k => { updated[k] = { ...prev[k], isReleased: true }; });
                return updated;
            });
        } catch (err) {
            console.error("Failed to release grades:", err);
        } finally {
            setReleasing(false);
        }
    }

    React.useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                setLoading(true);
                const [subs, gradeList] = await Promise.all([
                    getAssignmentSubmissions(assignment.id),
                    getAssignmentGrades(assignment.id).catch(() => []),
                ]);
                if (!mounted) return;
                setSubmissions(subs);
                const gradeMap = {};
                gradeList.forEach(g => { gradeMap[g.submissionId] = g; });
                setGrades(gradeMap);
                const initial = {};
                subs.forEach(s => {
                    const existing = gradeMap[s.id];
                    initial[s.id] = { points: existing ? String(existing.pointsEarned) : "", saving: false, error: null, editing: false };
                });
                setGradingState(initial);
            } catch (err) {
                console.error("Failed to load submissions:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [assignment.id]);

    function setField(subId, field, value) {
        setGradingState(prev => ({ ...prev, [subId]: { ...prev[subId], [field]: value } }));
    }

    async function handleGrade(sub) {
        const gs = gradingState[sub.id];
        const pts = parseFloat(gs?.points);
        if (isNaN(pts) || pts < 0 || pts > (assignment.points || Infinity)) {
            setField(sub.id, "error", `Enter a value between 0 and ${assignment.points ?? "max"}.`);
            return;
        }
        setField(sub.id, "saving", true);
        setField(sub.id, "error", null);
        try {
            const existing = grades[sub.id];
            let saved;
            if (existing) {
                await updateGrade(existing.id, { submissionId: sub.id, pointsEarned: pts, gradedBy: user.userId });
                saved = { ...existing, pointsEarned: pts };
            } else {
                saved = await createGrade({ submissionId: sub.id, pointsEarned: pts, gradedBy: user.userId });
            }
            await updateSubmission(sub.id, { assignmentId: sub.assignmentId, studentId: sub.studentId, fileUrl: sub.fileUrl, status: "Graded" }).catch(() => {});
            setGrades(prev => ({ ...prev, [sub.id]: saved }));
            setField(sub.id, "editing", false);
            setField(sub.id, "saving", false);
            setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: "Graded" } : s));
        } catch (err) {
            setField(sub.id, "error", err.message || "Failed to save grade.");
            setField(sub.id, "saving", false);
        }
    }

    const maxPts = assignment.points ?? null;

    // Filter submissions by selected cohort
    const visibleSubmissions = React.useMemo(() => {
        if (!selectedCohortId) return submissions;
        return submissions.filter(s => s.student && studentCohortMap[s.student.id] === selectedCohortId);
    }, [submissions, selectedCohortId, studentCohortMap]);

    const isQuizAnswer = (sub) => {
        try {
            if (!sub.fileUrl) return false;
            const parsed = JSON.parse(sub.fileUrl);
            return typeof parsed === "object" && !Array.isArray(parsed);
        } catch { return false; }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 px-8 pt-8 pb-4">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-brand transition-colors font-semibold text-sm group">
                        <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Assignments
                    </button>
                    <span className="text-gray-200">/</span>
                    <span className="text-sm text-gray-700 font-semibold truncate max-w-[320px]">{assignment.title}</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{assignment.title}</h1>
                        {!loading && (
                            <p className="text-gray-400 text-sm mt-1">
                                {visibleSubmissions.length} submission{visibleSubmissions.length !== 1 ? "s" : ""}
                                {maxPts != null && <><span className="ml-3 text-gray-300">|</span><span className="ml-3">Max: <strong>{maxPts} pts</strong></span></>}
                            </p>
                        )}
                        <div className="mt-3">
                            <CohortFilterBar cohorts={cohorts} selected={selectedCohortId} onChange={handleCohortChange} />
                        </div>
                    </div>
                    {!loading && visibleSubmissions.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-green-50 rounded-2xl text-center">
                                <p className="text-[9px] font-black uppercase tracking-wider text-green-600">Graded</p>
                                <p className="text-lg font-black italic text-green-700">
                                    {visibleSubmissions.filter(s => grades[s.id]).length}/{visibleSubmissions.length}
                                </p>
                            </div>
                            {Object.keys(grades).length > 0 && (
                                Object.values(grades).every(g => g.isReleased) ? (
                                    <div className="px-4 py-2 bg-purple-50 rounded-2xl flex items-center gap-2">
                                        <Check size={14} className="text-purple-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Released</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRelease}
                                        disabled={releasing}
                                        className="px-5 py-2.5 bg-brand text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-[#2d0059] transition-colors disabled:opacity-60"
                                    >
                                        {releasing ? "Releasing..." : "Release Grades"}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center flex-1 text-gray-400 font-medium">Loading submissions...</div>
            ) : visibleSubmissions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-8 pb-8">
                    <div className="text-center py-20 w-full bg-gray-50 rounded-[40px] border border-gray-200 text-gray-400 font-medium">
                        No submissions found for this group.
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden border-t border-gray-200 mt-2">
                    {/* Left — Student list */}
                    <div className="w-[340px] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50/30">
                        <div className="p-4 space-y-1">
                            {visibleSubmissions.map(sub => {
                                const studentName = sub.student ? `${sub.student.firstName} ${sub.student.lastName}` : sub.studentId;
                                const isSelected = selectedSub?.id === sub.id;
                                const existingGrade = grades[sub.id];

                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSelectedSub(sub)}
                                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                                            isSelected
                                                ? "bg-white border border-gray-200 shadow-sm"
                                                : "hover:bg-white/60 border border-transparent"
                                        }`}
                                    >
                                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
                                            isSelected ? "bg-brand text-white" : "bg-brand/5 border-2 border-brand/10 text-brand"
                                        }`}>
                                            {(sub.student?.firstName?.[0] || "?").toUpperCase()}{(sub.student?.lastName?.[0] || "").toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${isSelected ? "text-brand" : "text-gray-900"}`}>{studentName}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                sub.status === "Graded" ? "bg-green-100 text-green-700"
                                                : sub.status === "Late" ? "bg-orange-100 text-orange-600"
                                                : "bg-blue-50 text-blue-600"
                                            }`}>{sub.status || "Submitted"}</span>
                                            {existingGrade && maxPts != null && (
                                                <span className="text-[10px] font-bold text-gray-500">{existingGrade.pointsEarned}/{maxPts}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right — File viewer + grading */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {selectedSub ? (
                                <motion.div
                                    key={selectedSub.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }}
                                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15, ease: "easeIn" } }}
                                    className="p-6 space-y-6"
                                >
                                    {/* Student header */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">
                                                {(selectedSub.student?.firstName?.[0] || "?").toUpperCase()}{(selectedSub.student?.lastName?.[0] || "").toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{selectedSub.student ? `${selectedSub.student.firstName} ${selectedSub.student.lastName}` : selectedSub.studentId}</p>
                                            <p className="text-xs text-gray-400">{selectedSub.student?.email || ""}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-gray-500">{selectedSub.submittedAt ? new Date(selectedSub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                                            <p className="text-[10px] text-gray-400">{selectedSub.submittedAt ? new Date(selectedSub.submittedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            selectedSub.status === "Graded" ? "bg-green-100 text-green-700"
                                            : selectedSub.status === "Late" ? "bg-orange-100 text-orange-600"
                                            : selectedSub.status === "Submitted" || selectedSub.status === "Resubmitted" ? "bg-blue-50 text-blue-600"
                                            : "bg-gray-100 text-gray-500"
                                        }`}>{selectedSub.status || "Submitted"}</span>
                                    </div>

                                    {/* File viewer */}
                                    {isQuizAnswer(selectedSub) ? (
                                        <div className="bg-orange-50 rounded-3xl border border-orange-100 p-6">
                                            <p className="text-sm font-bold text-orange-700 mb-3">Quiz Response</p>
                                            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">{(() => {
                                                try { return JSON.stringify(JSON.parse(selectedSub.fileUrl), null, 2); } catch { return selectedSub.fileUrl; }
                                            })()}</pre>
                                        </div>
                                    ) : (
                                        <SubmissionFileViewer submission={selectedSub} />
                                    )}

                                    {/* Grading section */}
                                    {(() => {
                                        const existingGrade = grades[selectedSub.id];
                                        const gs = gradingState[selectedSub.id] || { points: "", saving: false, error: null, editing: false };
                                        const ptsVal = parseFloat(gs.points);
                                        const pct = maxPts && !isNaN(ptsVal) ? Math.round((ptsVal / maxPts) * 100) : null;

                                        return (
                                            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                                                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-4">Grade</h3>
                                                {existingGrade && !gs.editing ? (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-3xl font-black italic text-gray-900">
                                                                {existingGrade.pointsEarned}{maxPts != null && <span className="text-base font-normal text-gray-400">/{maxPts} pts</span>}
                                                            </span>
                                                            {maxPts != null && (
                                                                <div className="px-4 py-2 rounded-2xl bg-brand text-white">
                                                                    <span className="text-lg font-black italic">{Math.round((existingGrade.pointsEarned / maxPts) * 100)}%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setField(selectedSub.id, "editing", true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-500 hover:border-brand hover:text-brand transition">
                                                            <Edit2 size={13} /> Update
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-end gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <label className="text-xs text-gray-500 font-medium">Points{maxPts != null && ` (out of ${maxPts})`}</label>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number" min="0" max={maxPts ?? undefined} step="0.5"
                                                                    value={gs.points}
                                                                    onChange={e => setField(selectedSub.id, "points", e.target.value)}
                                                                    placeholder={maxPts != null ? `0 – ${maxPts}` : "Points"}
                                                                    disabled={gs.saving}
                                                                    className="w-32 px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                                                                />
                                                                {pct !== null && (
                                                                    <div className={`px-4 py-3 rounded-2xl font-black italic text-lg min-w-[65px] text-center ${pct >= 75 ? "bg-green-50 text-green-700" : pct >= 50 ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"}`}>
                                                                        {pct}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {gs.error && <p className="text-xs text-red-500 font-medium">{gs.error}</p>}
                                                        </div>
                                                        <div className="flex gap-2 pb-0.5">
                                                            {existingGrade && (
                                                                <button onClick={() => { setField(selectedSub.id, "editing", false); setField(selectedSub.id, "points", String(existingGrade.pointsEarned)); }} disabled={gs.saving} className="px-4 py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-400 hover:bg-gray-50 transition">
                                                                    Cancel
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleGrade(selectedSub)}
                                                                disabled={gs.saving || gs.points === ""}
                                                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white transition ${gs.saving || gs.points === "" ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand hover:bg-brand-deep shadow-lg shadow-brand/20"}`}
                                                            >
                                                                {gs.saving ? <><Loader size={13} className="animate-spin" /> Saving...</> : <><Check size={14} /> {existingGrade ? "Update" : "Submit Grade"}</>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-full text-gray-400 gap-3"
                                >
                                    <Users size={32} className="text-gray-200" />
                                    <p className="text-sm font-medium">Select a student to review their submission</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}

function AssignmentPreviewDrawer({ assignment, onClose }) {
    const typeInfo = ASSIGNMENT_TYPES.find(t => t.id === assignment.type);
    const Icon = typeInfo?.icon || FileText;

    const quizQuestions = React.useMemo(() => {
        if (assignment.type !== "quiz" || !assignment.quizQuestionsJson) return [];
        try { return JSON.parse(assignment.quizQuestionsJson); } catch { return []; }
    }, [assignment]);

    const externalTool = assignment.externalToolName
        ? EXTERNAL_TOOLS.find(t => t.name === assignment.externalToolName)
        : null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden"
                style={{ borderRadius: "40px 0 0 40px" }}
            >
                <div className="flex justify-between items-center px-10 py-8 border-b border-gray-200 shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900">Assignment Preview</h2>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand/10 text-brand">Student View</span>
                        </div>
                        <p className="text-sm text-gray-400">This is what students see</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-7">
                    <div className="bg-brand/5 rounded-[28px] p-6">
                        <div className="flex items-start gap-4">
                            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${typeInfo?.bg || "bg-gray-100"} shrink-0`}>
                                <Icon size={22} style={{ color: typeInfo?.color || "#64748B" }} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">{assignment.title}</h1>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{typeInfo?.label}</span>
                                    {assignment.points != null && (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand">{assignment.points} pts</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {(assignment.openDate || assignment.dueDate || assignment.closeDate) && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Timeline</label>
                            <div className="bg-gray-50 rounded-[24px] p-5 space-y-3">
                                {assignment.openDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Opens</span>
                                        <span className="text-xs text-green-600 font-semibold">{new Date(assignment.openDate).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                )}
                                {assignment.dueDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Due Date</span>
                                        <span className="text-xs text-orange-500 font-semibold">{new Date(assignment.dueDate).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                )}
                                {assignment.closeDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-500">Closes</span>
                                        <span className="text-xs text-red-500 font-semibold">{new Date(assignment.closeDate).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {assignment.description && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Instructions</label>
                            <div className="bg-gray-50 rounded-[24px] p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {assignment.description}
                            </div>
                        </div>
                    )}

                    {assignment.type === "external" && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">External Tool</label>
                            {assignment.externalToolName || assignment.externalToolUrl ? (
                                <div className="bg-gray-50 rounded-[24px] p-5 flex items-center gap-4">
                                    {externalTool ? (
                                        <span
                                            className={`w-12 h-12 rounded-2xl ${externalTool.bg} flex items-center justify-center text-lg font-black shrink-0`}
                                            style={{ color: externalTool.color }}
                                        >
                                            {externalTool.icon}
                                        </span>
                                    ) : (
                                        <span className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                                            <ExternalLink size={20} style={{ color: "#6366F1" }} />
                                        </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900">{assignment.externalToolName || "External Tool"}</p>
                                        {assignment.externalToolUrl && (
                                            <p className="text-xs text-gray-400 truncate mt-0.5">{assignment.externalToolUrl}</p>
                                        )}
                                    </div>
                                    {assignment.externalToolUrl && (
                                        <a
                                            href={assignment.externalToolUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1]/10 text-[#6366F1] text-xs font-bold hover:bg-[#6366F1]/20 transition-colors"
                                        >
                                            <ExternalLink size={13} /> Launch
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 bg-gray-50 rounded-2xl px-5 py-4">No external tool configured.</p>
                            )}
                        </div>
                    )}

                    {assignment.type === "quiz" && quizQuestions.length > 0 && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 block">Quiz Questions ({quizQuestions.length})</label>
                            <div className="space-y-4">
                                {quizQuestions.map((q, qi) => (
                                    <div key={qi} className="bg-gray-50 rounded-[24px] p-5 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className="w-6 h-6 rounded-full bg-ember/20 text-ember text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                                            <p className="text-sm text-gray-900 font-semibold flex-1">{q.question || <span className="text-gray-400 italic">No question text</span>}</p>
                                        </div>
                                        <div className="space-y-2 pl-9">
                                            {q.options?.map((opt, oi) => (
                                                <div key={oi} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
                                                    q.correctAnswer === oi ? "bg-green-50 text-green-700 font-semibold" : "bg-white text-gray-600"
                                                }`}>
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                        q.correctAnswer === oi ? "border-green-500 bg-green-500" : "border-gray-300"
                                                    }`}>
                                                        {q.correctAnswer === oi && <span className="w-2 h-2 rounded-full bg-white" />}
                                                    </span>
                                                    {opt || <span className="text-gray-400 italic">Empty option</span>}
                                                    {q.correctAnswer === oi && <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-green-600">Correct</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-10 py-6 border-t border-gray-200 shrink-0">
                    <button onClick={onClose} className="w-full py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition">
                        Close Preview
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function AssignmentGroupRow({ group, onDelete, onEdit, onClose, onView, onPreview }) {
    const [expanded, setExpanded] = React.useState(true);

    return (
        <motion.div variants={slideUp} className="mb-6">
            <div
                className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-[24px] cursor-pointer hover:bg-gray-100 transition-colors mb-3"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 transition-transform" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>
                        <ChevronDown size={18} />
                    </span>
                    <span className="font-bold text-gray-900 text-base">{group.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200">
                        {group.weight}% of grade
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                        {group.assignments.length} assignment{group.assignments.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/30">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Assignment</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Due</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Submissions</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.assignments.map(item => {
                                        const typeInfo = ASSIGNMENT_TYPES.find(t => t.id === item.type);
                                        const Icon = typeInfo?.icon || FileText;
                                        const submissionPct = item.totalStudents > 0 ? Math.round((item.submissions / item.totalStudents) * 100) : 0;

                                        return (
                                            <motion.tr key={item.id} layout className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition group">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${typeInfo?.bg || "bg-gray-100"}`}>
                                                            <Icon size={16} style={{ color: typeInfo?.color || "#64748B" }} />
                                                        </span>
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-brand transition-colors text-sm">{item.title}</div>
                                                            <div className="text-xs text-gray-400 mt-0.5">{typeInfo?.label} · {item.points} pts</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="text-xs text-gray-500 font-semibold">
                                                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                                    </div>
                                                    {item.closeDate && <div className="text-[10px] text-red-400 mt-0.5">Closes {new Date(item.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm font-black italic text-gray-900">{item.submissions}/{item.totalStudents}</span>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand rounded-full transition-[width]" style={{ width: `${submissionPct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                                                        item.isClosed ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                                                    }`}>
                                                        {item.isClosed ? "Closed" : "Open"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => onPreview(item)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 hover:bg-gray-100 transition whitespace-nowrap shadow-sm">
                                                            Preview
                                                        </button>
                                                        <button onClick={() => onView(item)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 group-hover:bg-brand group-hover:text-white group-hover:border-brand transition whitespace-nowrap shadow-sm">
                                                            Review
                                                        </button>
                                                        <button
                                                            onClick={() => onClose(group.id, item.id)}
                                                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.15em] transition whitespace-nowrap shadow-sm ${
                                                                item.isClosed ? "border-red-100 text-red-500 hover:bg-red-50" : "border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100"
                                                            }`}
                                                            title={item.isClosed ? "Click to reopen" : "Click to close"}
                                                        >
                                                            {item.isClosed ? "Reopen" : "Close"}
                                                        </button>
                                                        <button onClick={() => onEdit(group.id, item.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-brand hover:bg-brand/10 transition opacity-0 group-hover:opacity-100">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => onDelete(group.id, item.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function CourseAssignmentsView({ activeCourseId }) {
    const [assignments, setAssignments] = React.useState([]);
    const [submissionCounts, setSubmissionCounts] = React.useState({});
    const [enrollmentCount, setEnrollmentCount] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [showDrawer, setShowDrawer] = React.useState(false);
    const [editingAssignment, setEditingAssignment] = React.useState(null);
    const [activeTypeFilter, setActiveTypeFilter] = React.useState("all");
    const [reviewingAssignment, setReviewingAssignment] = React.useState(null);
    const [previewingAssignment, setPreviewingAssignment] = React.useState(null);

    // Cohort filter state
    const [cohorts, setCohorts] = React.useState([]);
    const [studentCohortMap, setStudentCohortMap] = React.useState({});
    const [selectedCohortId, setSelectedCohortId] = React.useState(null);

    const loadData = React.useCallback(async () => {
        if (!activeCourseId) return;
        try {
            setLoading(true);
            setSelectedCohortId(null);
            const [data, subs, count, cohortData, studentData] = await Promise.all([
                getCourseAssignments(activeCourseId),
                getCourseSubmissions(activeCourseId).catch(() => []),
                getCourseStudentCount(activeCourseId).catch(() => 0),
                getCourseCohorts(activeCourseId).catch(() => []),
                getCourseStudents(activeCourseId).catch(() => []),
            ]);
            const counts = {};
            (subs || []).forEach(s => { counts[s.assignmentId] = (counts[s.assignmentId] || 0) + 1; });
            const sorted = (data || []).sort((a, b) => new Date(b.createdAt ?? b.dueDate) - new Date(a.createdAt ?? a.dueDate));
            setAssignments(sorted);
            setSubmissionCounts(counts);
            setEnrollmentCount(count || 0);
            setCohorts(cohortData || []);
            const map = {};
            (studentData || []).forEach(st => { map[st.studentId] = st.classGroupId; });
            setStudentCohortMap(map);
        } catch (err) {
            console.error("Failed to load assignments:", err);
        } finally {
            setLoading(false);
        }
    }, [activeCourseId]);

    React.useEffect(() => { loadData(); }, [loadData]);

    const visibleAssignments = React.useMemo(() => {
        if (!selectedCohortId) return assignments;
        return assignments.filter(a => !a.classGroupId || a.classGroupId === selectedCohortId);
    }, [assignments, selectedCohortId]);

    const groups = React.useMemo(() => [{
        id: "all",
        name: "All Assignments",
        weight: 100,
        assignments: visibleAssignments.map(a => ({
            ...a,
            points: a.maxPoints,
            submissions: submissionCounts[a.id] || 0,
            totalStudents: enrollmentCount,
            published: !a.isClosed,
        }))
    }], [visibleAssignments, submissionCounts, enrollmentCount]);

    const handleDelete = async (groupId, assignmentId) => {
        try {
            await deleteAssignment(assignmentId);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleEdit = (groupId, assignmentId) => {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
            setEditingAssignment(assignment);
            setShowDrawer(true);
        }
    };

    const handleClose = async (groupId, assignmentId) => {
        try {
            const result = await closeAssignment(assignmentId);
            setAssignments(prev => prev.map(a => a.id !== assignmentId ? a : { ...a, isClosed: result.isClosed }));
        } catch (err) {
            console.error("Close failed:", err);
        }
    };

    const handleSave = async (formData) => {
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                openDate: formData.openDate ? new Date(formData.openDate).toISOString() : null,
                dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
                closeDate: formData.closeDate ? new Date(formData.closeDate).toISOString() : null,
                maxPoints: formData.maxPoints || formData.points,
                courseId: activeCourseId,
                type: formData.type,
                isClosed: false,
                allowMultipleAttempts: formData.allowMultipleAttempts ?? true,
                quizQuestionsJson: formData.quizQuestionsJson ?? null,
                externalToolName: formData.externalToolName ?? null,
                externalToolUrl: formData.externalToolUrl ?? null,
                classGroupId: formData.classGroupId ?? null,
            };
            if (editingAssignment) {
                await updateAssignment(editingAssignment.id, { ...payload, id: editingAssignment.id });
            } else {
                await createAssignment(payload);
            }
            await loadData();
            setEditingAssignment(null);
            setShowDrawer(false);
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
        }
    };

    const totalAssignments = assignments.length;
    const openCount = assignments.filter(a => !a.isClosed).length;

    const filteredGroups = activeTypeFilter === "all"
        ? groups
        : groups.map(g => ({ ...g, assignments: g.assignments.filter(a => a.type === activeTypeFilter) })).filter(g => g.assignments.length > 0);

    if (reviewingAssignment) {
        return (
            <TeacherSubmissionReview
                assignment={reviewingAssignment}
                onBack={() => setReviewingAssignment(null)}
                cohorts={cohorts}
                studentCohortMap={studentCohortMap}
                selectedCohortId={selectedCohortId}
                onCohortChange={setSelectedCohortId}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-row gap-6 p-8 overflow-hidden h-full">
            <motion.div className="flex-1 flex flex-col overflow-y-auto pr-2 min-w-0" initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.header variants={slideUp} className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Assignments</h1>
                        <div className="mt-3">
                            <CohortFilterBar cohorts={cohorts} selected={selectedCohortId} onChange={setSelectedCohortId} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowDrawer(true)}
                            className="bg-brand text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand/20"
                        >
                            <Plus size={18} /> Create Assignment
                        </motion.button>
                    </div>
                </motion.header>

                <motion.div variants={slideUp} className="grid grid-cols-3 gap-4 mb-10">
                    {[
                        { label: "Total Assignments", value: loading ? "..." : totalAssignments, accent: false },
                        { label: "Open", value: loading ? "..." : openCount, accent: true },
                        { label: "Closed", value: loading ? "..." : totalAssignments - openCount, accent: false },
                    ].map((stat) => (
                        <div key={stat.label} className={`rounded-[28px] px-7 py-6 flex flex-col gap-1 ${stat.accent ? "bg-brand text-white" : "bg-white border border-gray-200 shadow-sm"}`}>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${stat.accent ? "text-white/60" : "text-gray-400"}`}>{stat.label}</span>
                            <span className={`text-4xl font-black italic ${stat.accent ? "text-white" : "text-gray-900"}`}>{stat.value}</span>
                        </div>
                    ))}
                </motion.div>

                <motion.div variants={slideUp} className="mb-10">
                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-4">Assignment Types</h2>
                    <div className="flex flex-wrap gap-3">
                        {ASSIGNMENT_TYPES.map(t => {
                            const Icon = t.icon;
                            const count = groups.reduce((sum, g) => sum + g.assignments.filter(a => a.type === t.id).length, 0);
                            const isActive = activeTypeFilter === t.id;
                            return (
                                <motion.button
                                    key={t.id}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setActiveTypeFilter(isActive ? "all" : t.id)}
                                    className={`flex-1 min-w-[130px] flex flex-col items-start gap-3 p-5 rounded-[24px] border-2 text-left transition ${isActive ? "border-brand bg-brand/5 shadow-md" : "border-gray-200 bg-white hover:border-gray-200 hover:shadow-sm"}`}
                                >
                                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${t.bg}`}>
                                        <Icon size={20} style={{ color: t.color }} />
                                    </span>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-wider leading-tight ${isActive ? "text-brand" : "text-gray-500"}`}>{t.label}</p>
                                        <p className="text-2xl font-black italic text-gray-900 mt-1">{count}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {activeTypeFilter !== "all" && (
                    <motion.div variants={slideUp} className="mb-6 flex items-center gap-3">
                        <span className="text-sm text-gray-500">Filtering by:</span>
                        <button onClick={() => setActiveTypeFilter("all")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand font-bold text-xs uppercase tracking-wider hover:bg-brand/20 transition">
                            {ASSIGNMENT_TYPES.find(t => t.id === activeTypeFilter)?.label}
                            <X size={14} />
                        </button>
                    </motion.div>
                )}

                <motion.div variants={slideUp}>
                    <div className="mb-5">
                        <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Assignment Groups</h2>
                    </div>
                    {filteredGroups.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-gray-200 text-gray-400 font-medium">
                            No assignments match this filter.
                        </div>
                    ) : (
                        filteredGroups.map(group => (
                            <AssignmentGroupRow
                                key={group.id}
                                group={group}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onClose={handleClose}
                                onView={(item) => setReviewingAssignment(item)}
                                onPreview={(item) => setPreviewingAssignment(item)}
                            />
                        ))
                    )}
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {showDrawer && (
                    <CreateAssignmentDrawer
                        onClose={() => { setShowDrawer(false); setEditingAssignment(null); }}
                        onSave={handleSave}
                        initialData={editingAssignment}
                        cohorts={cohorts}
                        defaultGroupId={selectedCohortId}
                    />
                )}
            </AnimatePresence>

            {previewingAssignment && (
                <AssignmentPreviewDrawer
                    assignment={previewingAssignment}
                    onClose={() => setPreviewingAssignment(null)}
                />
            )}
        </div>
    );
}
