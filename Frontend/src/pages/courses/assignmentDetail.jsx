import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ArrowLeft,
  CheckCircle,
  CloseCircle,
  Calendar,
  InfoCircle,
} from "@solar-icons/react";
import { FileText, X, Loader } from "lucide-react";
import { getAssignmentById } from "../../services/assignmentService.jsx";
import {
  getSubmissionForAssignment,
  createSubmission,
  updateSubmission,
} from "../../services/submissionService.jsx";
import { uploadFileToCloudinary } from "../../services/cloudinaryService.js";
import { getStudentGrades, gradeQuiz } from "../../services/gradeService.js";
import { useAuth } from "../../contexts/AuthContext";

// ─────────────────────────────────────────────
// Animation variants – matches the rest of the course pages
// ─────────────────────────────────────────────
const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDueDate(dateStr) {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Past due", color: "text-red-500", bg: "bg-red-50" };
  if (diff === 0) return { label: "Due today", color: "text-orange-500", bg: "bg-orange-50" };
  if (diff === 1) return { label: "Due tomorrow", color: "text-orange-500", bg: "bg-orange-50" };
  if (diff <= 5) return { label: `${diff} days left`, color: "text-orange-500", bg: "bg-orange-50" };
  return { label: `${diff} days left`, color: "text-blue-500", bg: "bg-blue-50" };
}

// ─────────────────────────────────────────────
// File preview modal
// ─────────────────────────────────────────────
function FilePreviewModal({ file, onClose }) {
  const [objectUrl, setObjectUrl] = React.useState(null);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file || !objectUrl) return null;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={18} className="text-[#64748b] shrink-0" />
              <p className="font-bold text-gray-900 truncate text-sm">{file.name}</p>
              <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0 ml-4"
            >
              <X size={15} />
            </button>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
            {isImage && (
              <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-xl" />
            )}
            {isPdf && (
              <iframe src={objectUrl} title={file.name} className="w-full h-full min-h-[60vh] rounded-xl border-0" />
            )}
            {isVideo && (
              <video src={objectUrl} controls className="max-w-full max-h-full rounded-xl" />
            )}
            {isAudio && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#64748b]/10 flex items-center justify-center">
                  <FileText size={36} className="text-[#64748b]" />
                </div>
                <audio src={objectUrl} controls className="w-full max-w-sm" />
              </div>
            )}
            {!isImage && !isPdf && !isVideo && !isAudio && (
              <div className="flex flex-col items-center gap-3 text-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <FileText size={36} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-400">Preview not available for this file type</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Upload drop zone component
// ─────────────────────────────────────────────
function UploadZone({ file, onFileSelect, onFileClear, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  };

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : file ? "cursor-default" : "cursor-pointer"}
          ${dragging ? "border-[#64748b] bg-[#64748b]/5 scale-[1.01]" : file ? "border-green-300 bg-green-50/50" : "border-gray-200 bg-gray-50/50 hover:border-[#64748b]/40 hover:bg-[#64748b]/3"}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={disabled}
          onChange={(e) => { if (e.target.files[0]) onFileSelect(e.target.files[0]); }}
          accept=".pdf,.doc,.docx,.docm,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.mov,.mp3,.wav,.fig,.sketch"
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-4 w-full"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <FileText size={26} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{file.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewing(true); }}
                  className="px-3 py-1.5 rounded-xl bg-[#64748b]/8 text-[#64748b] text-xs font-bold hover:bg-[#64748b]/15 transition-colors"
                >
                  Preview
                </button>
                {!disabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFileClear(); }}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Upload size={28} className="text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">
                  Drag & drop your file here, or{" "}
                  <span className="text-[#64748b] font-bold">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, Word, PowerPoint, Excel, ZIP, images, video & more
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {previewing && (
        <FilePreviewModal file={file} onClose={() => setPreviewing(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Assignment Detail Page
// ─────────────────────────────────────────────
export default function AssignmentDetail({ assignmentId, activeCourseId }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [loadingSubmission, setLoadingSubmission] = useState(true);

  const [file, setFile] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [existingGrade, setExistingGrade] = useState(null);

  // Fetch assignment details
  useEffect(() => {
    let mounted = true;
    async function fetchAssignment() {
      if (!assignmentId) return;
      try {
        setLoadingAssignment(true);
        const data = await getAssignmentById(assignmentId);
        if (mounted) setAssignment(data);
      } catch (err) {
        console.error("Failed to load assignment:", err);
      } finally {
        if (mounted) setLoadingAssignment(false);
      }
    }
    fetchAssignment();
    return () => { mounted = false; };
  }, [assignmentId]);

  // Check for an existing submission (and grade)
  useEffect(() => {
    let mounted = true;
    async function fetchSubmission() {
      if (!assignmentId || !user?.userId) return;
      try {
        setLoadingSubmission(true);
        const [sub, grades] = await Promise.all([
          getSubmissionForAssignment(user.userId, assignmentId).catch(() => null),
          getStudentGrades(user.userId).catch(() => []),
        ]);
        if (!mounted) return;
        if (sub) {
          setExistingSubmission(sub);
          // Pre-fill quiz answers from the stored submission
          if (sub.fileUrl) {
            try {
              const parsed = JSON.parse(sub.fileUrl);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const answers = {};
                Object.entries(parsed).forEach(([k, v]) => { answers[parseInt(k)] = v; });
                setQuizAnswers(answers);
              }
            } catch { /* not a quiz submission */ }
          }
          // Find any existing grade for this submission
          const grade = grades.find(g => g.submissionId === sub.id);
          if (grade) setExistingGrade(grade);
        }
      } catch (err) {
        console.warn("No existing submission found:", err);
      } finally {
        if (mounted) setLoadingSubmission(false);
      }
    }
    fetchSubmission();
    return () => { mounted = false; };
  }, [assignmentId, user?.userId]);

  // Submit handler
  async function handleSubmit() {
    const isQuiz = assignment?.type === "quiz";
    if (!isQuiz && !file) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let fileUrl;
      if (isQuiz) {
        fileUrl = JSON.stringify(quizAnswers);
      } else {
        fileUrl = await uploadFileToCloudinary(file);
      }

      let submissionId;
      if (existingSubmission) {
        await updateSubmission(existingSubmission.id, {
          fileUrl,
          status: isQuiz ? "Graded" : "Resubmitted",
          assignmentId,
          studentId: user.userId,
        });
        submissionId = existingSubmission.id;
        setExistingSubmission((prev) => ({ ...prev, fileUrl, status: isQuiz ? "Graded" : "Resubmitted", submittedAt: new Date().toISOString() }));
      } else {
        const created = await createSubmission({
          assignmentId,
          studentId: user.userId,
          fileUrl,
          status: isQuiz ? "Graded" : "Submitted",
        });
        submissionId = created.id;
        setExistingSubmission(created);
      }

      // Quizzes are marked on the server from the saved answers, so a student can't post their own score
      if (isQuiz && quizQuestions.length > 0) {
        try {
          setExistingGrade(await gradeQuiz(submissionId));
        } catch (gradeErr) {
          console.error("Quiz marking failed:", gradeErr);
        }
      }

      setJustSubmitted(true);
      setFile(null);
      setQuizStarted(false);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const daysLeft = assignment ? getDaysLeft(assignment.dueDate) : null;
  const isSubmitted = !!existingSubmission;
  const isPastDue = assignment ? new Date(assignment.dueDate) < new Date() : false;
  const isClosed = assignment?.isClosed === true;
  const canResubmit = assignment?.allowMultipleAttempts !== false;
  const isQuiz = assignment?.type === "quiz";
  const quizQuestions = React.useMemo(() => {
    if (!isQuiz || !assignment?.quizQuestionsJson) return [];
    try { return JSON.parse(assignment.quizQuestionsJson); } catch { return []; }
  }, [isQuiz, assignment?.quizQuestionsJson]);

  // Compute quiz results from stored answers vs correct answers
  const quizResults = React.useMemo(() => {
    if (!isQuiz || quizQuestions.length === 0 || Object.keys(quizAnswers).length === 0) return null;
    const maxPts = assignment?.points ?? quizQuestions.length;
    let correct = 0;
    const perQuestion = quizQuestions.map((q, qi) => {
      const chosen = quizAnswers[qi];
      const isCorrect = chosen === q.correctAnswer;
      if (isCorrect) correct++;
      return { qi, isCorrect, chosen, correctAnswer: q.correctAnswer, question: q.question, options: q.options };
    });
    const pointsEarned = Math.round((correct / quizQuestions.length) * maxPts * 10) / 10;
    return { correct, total: quizQuestions.length, pointsEarned, maxPts, pct: Math.round((correct / quizQuestions.length) * 100), perQuestion };
  }, [isQuiz, quizQuestions, quizAnswers, assignment?.points]);

  return (
    <motion.div
      className="flex-1 overflow-y-auto pb-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
        {/* ── Breadcrumb ── */}
        <motion.div variants={slideUp} className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/courses/${activeCourseId}/assignments`)}
            className="flex items-center gap-2 text-gray-400 hover:text-[#64748b] transition-colors font-semibold text-sm group"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Assignments
          </button>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-400 font-medium truncate max-w-[260px]">
            {loadingAssignment ? <span className="inline-block h-4 rounded-full bg-gray-200 animate-pulse w-40 align-middle" /> : assignment?.title}
          </span>
        </motion.div>

        {loadingAssignment ? (
          <div className="space-y-6 animate-pulse">
            {/* Title + meta chips */}
            <div className="space-y-4">
              <div className="h-10 rounded-2xl bg-gray-200 w-3/4" />
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100 w-36" />)}
              </div>
            </div>
            {/* Description block */}
            <div className="p-6 bg-white rounded-3xl border border-gray-200 space-y-3">
              <div className="h-4 rounded-full bg-gray-200 w-32 mb-4" />
              {[90, 75, 85, 60, 80].map((w, i) => (
                <div key={i} className="h-4 rounded-full bg-gray-100" style={{ width: `${w}%` }} />
              ))}
            </div>
            {/* Submission area */}
            <div className="h-44 rounded-3xl bg-gray-100" />
          </div>
        ) : !assignment ? (
          <div className="flex items-center justify-center h-64 text-red-400 font-medium">
            Assignment not found.
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Title & Meta bar ── */}
            <motion.div variants={slideUp}>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
                {assignment.title}
              </h1>

              {/* Info strip – Due | Points | Status */}
              <div className="flex flex-wrap gap-3">
                {/* Due date */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Calendar size={18} className="text-[#64748b]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Due</span>
                    <span className="text-sm font-bold text-gray-900 leading-tight">
                      {formatDueDate(assignment.dueDate)}
                    </span>
                  </div>
                </div>

                {/* Days left badge */}
                {daysLeft && (
                  <div className="flex items-center px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                    <span className="text-sm font-bold text-gray-600">{daysLeft.label}</span>
                  </div>
                )}

                {/* Points */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <InfoCircle size={18} className="text-[#78716c]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Points</span>
                    <span className="text-sm font-bold text-gray-900 leading-tight">
                      {assignment.maxPoints ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Submission status */}
                {!loadingSubmission && (
                  <div className="flex items-center gap-2 px-5 py-3 rounded-2xl border bg-white border-gray-200 shadow-sm">
                    {isSubmitted
                      ? <CheckCircle size={18} className="text-gray-600" />
                      : <CloseCircle size={18} className="text-gray-400" />}
                    <span className="text-sm font-bold text-gray-600">
                      {isSubmitted ? existingSubmission.status || "Submitted" : "Not submitted"}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Description Card ── */}
            <motion.div
              variants={slideUp}
              className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6"
            >
              <h2 className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-5">
                Assignment Brief
              </h2>
              <p className="text-gray-600 leading-relaxed text-base whitespace-pre-wrap">
                {assignment.description || "No description provided for this assignment."}
              </p>
            </motion.div>

            {/* ── Existing Submission Card (if submitted) ── */}
            <AnimatePresence>
              {(isSubmitted || justSubmitted) && (
                <motion.div
                  key="submission-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm"
                >
                  <h2 className="text-[10px] font-black uppercase tracking-wider text-gray-600 mb-5">
                    Your Submission
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <FileText size={22} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {existingSubmission?.fileUrl || "File submitted"}
                      </p>
                      {existingSubmission?.submittedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Submitted on{" "}
                          {new Date(existingSubmission.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {existingGrade && (
                        <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                          Grade: {existingGrade.pointsEarned ?? "—"} / {assignment?.maxPoints ?? "—"}
                        </span>
                      )}
                      <span className="px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                        {existingSubmission?.status || "Submitted"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submission Upload Area ── */}
            {isClosed ? (
              <motion.div
                variants={slideUp}
                className="bg-white border border-gray-200 rounded-3xl p-6 text-center shadow-sm"
              >
                <p className="text-gray-900 font-bold text-lg mb-1">Assignment Closed</p>
                <p className="text-gray-500 text-sm">This assignment has been closed by your lecturer. No more submissions are accepted.</p>
              </motion.div>
            ) : isSubmitted && !canResubmit ? (
              <motion.div
                variants={slideUp}
                className="bg-white border border-gray-200 rounded-3xl p-6 text-center shadow-sm"
              >
                <p className="text-gray-600 font-medium">Only one submission is allowed for this assignment.</p>
              </motion.div>
            ) : isQuiz ? (
              /* Quiz submission area */
              <motion.div variants={slideUp} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                {/* Results view – shown when already submitted and not retaking */}
                {isSubmitted && !quizStarted && quizResults ? (
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-[#78716c] mb-6">Quiz Results</h2>
                    {/* Score summary */}
                    <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-2xl">
                      <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center font-black italic shrink-0 ${
                        quizResults.pct >= 75 ? "bg-green-100 text-green-700"
                        : quizResults.pct >= 50 ? "bg-orange-100 text-orange-600"
                        : "bg-red-100 text-red-600"
                      }`}>
                        <span className="text-3xl leading-none">{quizResults.pct}%</span>
                      </div>
                      <div>
                        <p className="text-2xl font-black italic text-gray-900">
                          {quizResults.correct} / {quizResults.total} correct
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {quizResults.pointsEarned} / {quizResults.maxPts} pts
                        </p>
                      </div>
                    </div>
                    {/* Per-question breakdown */}
                    <div className="space-y-4 mb-8">
                      {quizResults.perQuestion.map(({ qi, isCorrect, chosen, correctAnswer, question, options }) => (
                        <div key={qi} className={`rounded-2xl p-4 border-2 ${
                          isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        }`}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            }`}>
                              {isCorrect ? "✓" : "✗"}
                            </span>
                            <p className="font-semibold text-gray-900">{qi + 1}. {question}</p>
                          </div>
                          <div className="space-y-1.5 ml-9">
                            {options.map((opt, oi) => (
                              <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                                oi === correctAnswer
                                  ? "bg-green-200/60 text-green-800 font-bold"
                                  : oi === chosen && !isCorrect
                                  ? "bg-red-200/60 text-red-700 line-through"
                                  : "text-gray-500"
                              }`}>
                                {oi === correctAnswer && <span className="text-green-600 font-black text-xs">✓</span>}
                                {oi === chosen && !isCorrect && <span className="text-red-500 font-black text-xs">✗</span>}
                                {oi !== correctAnswer && oi !== chosen && <span className="w-3" />}
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Retake button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => { setQuizStarted(true); setQuizAnswers({}); }}
                        className="px-8 py-3.5 rounded-2xl bg-[#78716c] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#e0722a] transition"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  </div>
                ) : !quizStarted && !isSubmitted ? (
                  /* Pre-start screen */
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-[#78716c] mb-6">Quiz</h2>
                    <div className="flex flex-col items-center gap-6 py-6">
                      <p className="text-gray-500 text-sm">{quizQuestions.length} question{quizQuestions.length !== 1 ? "s" : ""} — select the correct answer for each</p>
                      <button
                        onClick={() => setQuizStarted(true)}
                        className="px-10 py-4 rounded-2xl bg-[#78716c] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#e0722a] transition shadow-lg shadow-[#78716c]/20"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active quiz */
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-[#78716c] mb-6">Quiz</h2>
                    <div className="space-y-6">
                      {quizQuestions.map((q, qi) => (
                        <div key={qi} className="bg-gray-50 rounded-2xl p-4">
                          <p className="font-semibold text-gray-900 mb-4">{qi + 1}. {q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition ${
                                quizAnswers[qi] === oi
                                  ? "bg-[#64748b]/10 border-2 border-[#64748b]"
                                  : "bg-white border-2 border-gray-200 hover:border-gray-200"
                              }`}>
                                <input
                                  type="radio"
                                  name={`q-${qi}`}
                                  checked={quizAnswers[qi] === oi}
                                  onChange={() => setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                                  className="accent-[#64748b]"
                                  disabled={submitting}
                                />
                                <span className="text-sm font-medium text-gray-700">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <AnimatePresence>
                        {submitError && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-sm text-red-500 font-medium">{submitError}</motion.p>
                        )}
                      </AnimatePresence>
                      <div className="flex justify-end">
                        <button
                          onClick={handleSubmit}
                          disabled={submitting || Object.keys(quizAnswers).length < quizQuestions.length}
                          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider text-white transition shadow-sm ${
                            submitting || Object.keys(quizAnswers).length < quizQuestions.length
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                              : "bg-[#64748b] hover:bg-[#475569] shadow-[#64748b]/20"
                          }`}
                        >
                          {submitting ? <><Loader size={16} className="animate-spin" /> Submitting...</> : <><Upload size={16} /> Submit Quiz</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                variants={slideUp}
                className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6"
              >
                <h2 className="text-[10px] font-black uppercase tracking-wider text-[#64748b] mb-2">
                  {isSubmitted ? "Resubmit Work" : "Submit Your Work"}
                </h2>
                {isPastDue && !isSubmitted && (
                  <p className="text-sm text-gray-600 font-semibold mb-4">This assignment is past due — late submissions are still accepted.</p>
                )}
                {isSubmitted && (
                  <p className="text-sm text-gray-400 mb-6">
                    You've already submitted. You can resubmit at any time.
                  </p>
                )}
                {!isSubmitted && !isPastDue && <div className="mb-6" />}

                {/* File upload zone */}
                <UploadZone
                  file={file}
                  onFileSelect={setFile}
                  onFileClear={() => setFile(null)}
                  disabled={submitting}
                />

                {/* Comment / notes field */}
                <div className="mt-6">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                    Submission Comments (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={submitting}
                    rows={3}
                    placeholder="Add any notes for your lecturer..."
                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 text-sm text-gray-700 resize-none focus:outline-none focus:border-[#64748b] transition-colors placeholder:text-gray-300 disabled:opacity-50"
                  />
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {submitError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 text-sm text-red-500 font-medium"
                    >
                      {submitError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {file
                      ? `Ready to submit: ${file.name}`
                      : "Select a file to enable submission"}
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={!file || submitting}
                    className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider text-white transition shadow-sm
                      ${!file || submitting
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-[#64748b] hover:bg-[#475569] shadow-[#64748b]/20"}`}
                  >
                    {submitting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {isSubmitted ? "Resubmit" : "Submit Assignment"}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
  );
}
