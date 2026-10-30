import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Search, Check, Users, ArrowLeft, 
  BookOpen, Calendar, HelpCircle, Loader2, Sparkles
} from "lucide-react";
import { 
  courseService, 
  userService, 
  subjectService, 
  enrollmentService 
} from "../../services/adminService";

export default function CreateCoursePage() {
  const navigate = useNavigate();
  
  // Form States
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [capacity, setCapacity] = useState(150);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Data States
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load teachers and students from API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [fetchedTeachers, fetchedStudents] = await Promise.all([
          userService.getTeachers(),
          userService.getStudents()
        ]);
        setTeachers(fetchedTeachers || []);
        setStudents(fetchedStudents || []);
        
        if (fetchedTeachers.length > 0) {
          setSelectedTeacherId(fetchedTeachers[0].id);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setErrorMessage("Error retrieving user registry. Please check backend connection.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const email = student.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [students, searchQuery]);

  // Student list selection helpers
  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(prev => {
      const union = new Set([...prev, ...filteredIds]);
      return Array.from(union);
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim() || !selectedTeacherId) {
      setErrorMessage("Please complete all required fields (Course Name, Code, and Lecturer).");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      // 1. Create the Subject entry
      const subjectPayload = {
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        description: description.trim() || "No course description provided."
      };
      
      const newSubject = await subjectService.getSubjects().then(async (existing) => {
        // Double check if subject code already exists to reuse or prevent duplicate errors
        const found = existing.find(s => s.code.toLowerCase() === subjectCode.trim().toLowerCase());
        if (found) return found;
        
        // Use the proper service function that points to the correct backend host
        return await subjectService.createSubject(subjectPayload);
      });

      // 2. Create the Course Offering
      const coursePayload = {
        term: term,
        year: parseInt(year),
        capacity: parseInt(capacity) || 150,
        subjectId: newSubject.id,
        teacherId: selectedTeacherId,
        isVisible: false, // Starts as draft, lecturer publishes
        degree: "UX Design Degree" // Default program linkage
      };

      const newCourse = await courseService.createCourse(coursePayload);

      // 3. Enroll students if any are selected
      if (selectedStudentIds.length > 0) {
        await enrollmentService.bulkEnrollStudents(newCourse.id, selectedStudentIds);
      }

      setSubmitSuccess(true);
      
      // Auto redirect back to Course Management after short delay
      setTimeout(() => {
        navigate("/courses");
      }, 2000);

    } catch (err) {
      console.error("Course creation failed:", err);
      setErrorMessage(err.message || "Failed to create course. Please verify form details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1700px] mx-auto px-8 pb-12 animate-pulse">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-3 mt-2">
            <div className="h-3 rounded-full bg-gray-200 w-40" />
            <div className="h-10 rounded-2xl bg-gray-200 w-96 mt-1" />
          </div>
          <div className="h-9 rounded-2xl bg-gray-100 w-52" />
        </div>
        {/* Form skeleton */}
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Left column */}
          <div className="flex-1 space-y-6">
            <div className="p-8 bg-white border border-gray-100 rounded-3xl space-y-5">
              <div className="h-5 rounded-full bg-gray-200 w-44 mb-2" />
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100" />)}
            </div>
            <div className="p-8 bg-white border border-gray-100 rounded-3xl space-y-5">
              <div className="h-5 rounded-full bg-gray-200 w-36 mb-2" />
              {[1, 2].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100" />)}
            </div>
          </div>
          {/* Right column */}
          <div className="xl:w-[420px] space-y-6">
            <div className="p-8 bg-white border border-gray-100 rounded-3xl space-y-5">
              <div className="h-5 rounded-full bg-gray-200 w-36 mb-2" />
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100" />)}
            </div>
            <div className="h-14 rounded-3xl bg-brand/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] mx-auto px-8 pb-12 font-sans">
      
      {/* Breadcrumbs / Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate("/courses")}
            className="flex items-center gap-2 text-xs font-bold text-brand/80 hover:text-brand transition-colors cursor-pointer select-none"
          >
            <ArrowLeft size={14} />
            <span>Back to Course Registry</span>
          </button>
          <div className="flex items-center gap-2.5 mt-2">
             <div className="w-1.5 h-6 bg-brand rounded-full" />
             <h1 className="text-4xl font-black tracking-tighter text-gray-900 leading-none">
               Create New <span className="text-brand">Course offering</span>
             </h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand/5 text-brand border border-brand/10 text-xs font-bold">
          <Sparkles size={14} className="animate-pulse" />
          <span>System Administrator Mode</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {submitSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl mx-auto py-16 px-10 bg-white rounded-3xl border border-gray-100 shadow-2xl flex flex-col items-center text-center gap-6 mt-12"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 animate-bounce">
              <Check size={40} strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-gray-900">Course Registered!</h2>
              <p className="text-sm text-gray-500 font-medium max-w-sm">
                The catalog subject and course offering have been created in the database. Redirecting to registry...
              </p>
            </div>
            <Loader2 className="w-6 h-6 text-brand animate-spin mt-4" />
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8">
            
            {/* Left Column: Course Parameters */}
            <div className="flex-1 space-y-6">
              
              <div className="p-8 bg-white border border-gray-100 shadow-md rounded-3xl space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <BookOpen className="text-brand" size={20} />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Course Definition</h3>
                </div>

                {/* Course Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                    Course Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. User Interface Design 300"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none"
                  />
                </div>

                {/* Code & Lecturer Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Subject Code */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                      Course Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. UI300"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none uppercase"
                    />
                  </div>

                  {/* Lecturer Assignment */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                      Lecturer <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        required
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none appearance-none cursor-pointer"
                      >
                        {teachers.length === 0 ? (
                          <option disabled value="">No Teachers Available</option>
                        ) : (
                          teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                          ))
                        )}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                    Description
                  </label>
                  <textarea 
                    rows={4}
                    placeholder="Enter academic summary, prerequisites, or learning outcomes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-semibold text-gray-800 transition outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Offer Details */}
              <div className="p-8 bg-white border border-gray-100 shadow-md rounded-3xl space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <Calendar className="text-brand" size={20} />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Academic Offer Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Academic Year */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Academic Year</label>
                    <input 
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none"
                    />
                  </div>

                  {/* Semester / Term */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Active Semester</label>
                    <div className="relative">
                      <select 
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none appearance-none cursor-pointer"
                      >
                        <option>Term 1</option>
                        <option>Term 2</option>
                        <option>Semester 1</option>
                        <option>Semester 2</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Capacity (Max Students)</label>
                    <input 
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:border-brand/20 focus:bg-white px-6 py-4 rounded-2xl text-[14px] font-bold text-gray-900 transition outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Student Enrolment List */}
            <div className="w-full xl:w-[500px] shrink-0">
              
              <div className="p-8 bg-white border border-gray-100 shadow-md rounded-3xl flex flex-col h-[600px]">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="text-brand" size={20} />
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Enrol Students</h3>
                  </div>
                  <span className="px-3 py-1 bg-brand/5 rounded-xl text-[11px] font-black text-brand">
                    Selected: {selectedStudentIds.length}
                  </span>
                </div>

                {/* Student Search */}
                <div className="relative my-4 shrink-0">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search student database..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:border-brand/20 focus:bg-white rounded-xl text-xs font-semibold text-gray-900 outline-none transition"
                  />
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={handleSelectAllFiltered}
                    className="flex-1 py-2 border border-gray-100 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-600 rounded-xl cursor-pointer transition"
                  >
                    Select All Search
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDeselectAllFiltered}
                    className="flex-1 py-2 border border-gray-100 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-600 rounded-xl cursor-pointer transition"
                  >
                    Clear Search
                  </button>
                </div>

                {/* Scrollable Student Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {filteredStudents.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-xs font-semibold text-gray-400">No students matched search criteria</p>
                    </div>
                  ) : (
                    filteredStudents.map(student => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <div 
                          key={student.id}
                          onClick={() => handleToggleStudent(student.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none group
                            ${isSelected 
                              ? "bg-brand/5 border-brand/20" 
                              : "bg-transparent border-gray-100/50 hover:bg-gray-50/60"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Initials Badge */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0
                              ${isSelected 
                                ? "bg-brand text-white" 
                                : "bg-gray-100 text-gray-500 group-hover:bg-brand/10 group-hover:text-brand"
                              }`}
                            >
                              {student.firstName[0]}{student.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">
                                {student.firstName} {student.lastName}
                              </h4>
                              <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">
                                {student.email}
                              </p>
                            </div>
                          </div>
                          
                          {/* Checkbox indicator */}
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition
                            ${isSelected 
                              ? "bg-brand border-brand text-white" 
                              : "border-gray-200 group-hover:border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </form>
        )}
      </AnimatePresence>

      {/* Error & Form Actions Panel */}
      {!submitSuccess && (
        <div className="w-full max-w-full mt-6 bg-white border border-gray-100 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            {errorMessage ? (
              <p className="text-xs font-semibold text-red-500 flex items-center gap-2">
                <HelpCircle size={16} />
                <span>{errorMessage}</span>
              </p>
            ) : (
              <p className="text-xs font-medium text-gray-400">
                * By registering this course offering, it will be initialized as a <strong className="text-gray-600 font-semibold">Draft</strong>. The assigned lecturer can check it and publish it to the students when ready.
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
            <button 
              type="button"
              onClick={() => navigate("/courses")}
              className="flex-1 md:flex-none px-6 py-3 border-2 border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[11px] hover:bg-gray-50 rounded-2xl cursor-pointer transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !subjectName.trim() || !subjectCode.trim() || !selectedTeacherId}
              className="flex-1 md:flex-none px-10 py-3 bg-brand text-white font-black uppercase tracking-wider text-[11px] shadow-lg shadow-brand/25 hover:scale-[1.03] active:scale-[0.98] transition disabled:opacity-50 disabled:hover:scale-100 rounded-2xl cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Course</span>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Chevron helper
function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}
