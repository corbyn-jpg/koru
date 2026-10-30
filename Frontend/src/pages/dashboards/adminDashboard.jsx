import React, { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users, BookOpen, GraduationCap, UserCheck } from "lucide-react";

import { CreateCourseModal } from "../courses/adminCoursesComponents";
import {
  courseService,
  userService,
  enrollmentService,
  registrationService,
} from "../../services/adminService";
import {
  FilterDropdown,
  LecturerColumn,
  CourseColumn,
  StudentColumn,
  AddLecturerForm,
  AddStudentForm,
  EditUserModal,
  SendNotificationModal,
} from "./adminDashboardComponents";
import { createEvent, getAllEvents } from "../../services/eventService";
import DashboardHeader from "../../components/DashboardHeader";
import { getCourseCohorts, getCourseStudents, getClassGroups } from "../../services/classGroupService";
import { classService } from "../../services/classService";

const column = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_COURSE_FORM = {
  name: "",
  code: "",
  teacherId: "",
  year: String(CURRENT_YEAR),
  term: "Semester 1",
  capacity: "50",
};

export default function AdminDashboard() {
  // ── Global filters ──
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("1");

  // ── Data state ──
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [events, setEvents] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Selection state ──
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // ── Cohort data for selected course ──
  const [courseCohorts, setCourseCohorts] = useState([]);
  const [cohortStudentMap, setCohortStudentMap] = useState({});

  // ── Search state ──
  const [courseSearch, setCourseSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // ── Modal state ──
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { user, label }


  // ── Course creation state ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseForm, setCourseForm] = useState(DEFAULT_COURSE_FORM);
  const [createTeachers, setCreateTeachers] = useState([]);

  // ── Data fetch ──
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rawTeachers, rawCourses, rawEnrollments, rawClasses, rawEvents, rawClassGroups] = await Promise.all([
        userService.getTeachers(),
        courseService.getAllCourses(),
        enrollmentService.getAll(),
        classService.getAll().catch(() => []),
        getAllEvents().catch(() => []),
        getClassGroups().catch(() => []),
      ]);

      const normalizedTeachers = rawTeachers.map(t => ({
        ...t,
        name: `${t.firstName} ${t.lastName}`,
      }));

      const normalizedCourses = rawCourses.map(c => ({
        ...c,
        title: c.name || c.subject?.name || "Unknown Course",
        code: c.code || c.subject?.code || "",
        lecturerId: c.teacherId,
        semester: c.term?.includes("2") ? 2 : 1,
      }));

      const studentMap = {};
      rawEnrollments.forEach(e => {
        if (!e.student) return;
        const sid = e.student.id;
        if (!studentMap[sid]) {
          studentMap[sid] = {
            ...e.student,
            name: `${e.student.firstName} ${e.student.lastName}`,
            courseIds: [],
          };
        }
        studentMap[sid].courseIds.push(e.courseId);
      });

      setLecturers(normalizedTeachers);
      setCourses(normalizedCourses);
      setStudents(Object.values(studentMap));
      setClasses(rawClasses);
      setEnrollments(rawEnrollments);
      setEvents(rawEvents);
      setClassGroups(rawClassGroups);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Load teachers for course creation modal ──
  useEffect(() => {
    userService.getTeachers().catch(() => []).then(t => setCreateTeachers(t || []));
  }, []);

  // ── Available calendar years derived from courses ──
  const availableYears = useMemo(() => {
    return [...new Set(courses.map(c => c.year.toString()))].sort((a, b) => a - b);
  }, [courses]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(year)) {
      setYear(availableYears[0]);
    }
  }, [availableYears]);

  // ── Derived data ──
  const filteredCourses = useMemo(() => {
    return courses.filter(
      c =>
        c.year === parseInt(year) &&
        c.semester === parseInt(semester) &&
        c.title.toLowerCase().includes(courseSearch.toLowerCase())
    );
  }, [courses, year, semester, courseSearch]);

  const selectedCourse = useMemo(
    () => courses.find(c => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const courseLecturer = useMemo(
    () => selectedCourse ? lecturers.find(l => l.id === selectedCourse.lecturerId) || null : null,
    [selectedCourse, lecturers]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedCourseId) return [];
    return students
      .filter(
        s =>
          s.courseIds.includes(selectedCourseId) &&
          s.name.toLowerCase().includes(studentSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedCourseId, studentSearch]);

  // ── Compute warning course details: any course where at least 1 enrolled student has no class slots ──
  const warningCourseDetails = useMemo(() => {
    const warnings = new Map(); // Map of courseId -> descriptive error message
    courses.forEach(course => {
      // Filter for active enrollments in this course
      const courseEnrollments = enrollments.filter(
        e => e.courseId === course.id && e.status === "Active" && e.student
      );
      if (courseEnrollments.length === 0) return;

      // Count course-level (unassigned) class slots from Classes table
      const unassignedClassesCount = classes.filter(
        c => c.courseId === course.id && (!c.classGroupId || c.classGroupId === "")
      ).length;

      // Count course-level (unassigned) class slots from Events table (filtered and deduplicated)
      const seenEvents = new Set();
      const courseClassEvents = events.filter(e => {
        if (e.courseId !== course.id) return false;
        const t = e.eventType?.toLowerCase();
        if (t !== "class" && t !== "lecture" && t !== "workshop" && t !== "practical") return false;
        
        const start = e.startTime ? new Date(e.startTime) : null;
        const key = `${(e.title || "").toLowerCase()}|${start ? start.getDay() : "?"}|${start ? `${start.getHours()}:${start.getMinutes()}` : "?"}`;
        if (seenEvents.has(key)) return false;
        seenEvents.add(key);
        return true;
      });

      const totalUnassignedCount = unassignedClassesCount + courseClassEvents.length;

      // Check if any cohort/group in this course has no classes assigned to it (but has students)
      const cohortsWithStudents = new Set();
      courseEnrollments.forEach(e => {
        if (e.classGroupId) {
          cohortsWithStudents.add(e.classGroupId);
        }
      });

      let warningMessage = null;

      // 1. Check if there are unassigned students but no course-level classes
      const hasUnassignedStudents = courseEnrollments.some(e => !e.classGroupId);
      if (hasUnassignedStudents && totalUnassignedCount === 0) {
        warningMessage = "There are no classes for unassigned students";
      } else {
        // 2. Check if any cohort with students has no class slots
        for (const cohortId of cohortsWithStudents) {
          const cohortClassCount = classes.filter(c => c.classGroupId === cohortId).length;
          if (cohortClassCount === 0) {
            const cohort = classGroups.find(g => g.id === cohortId);
            const cohortName = cohort ? cohort.name : "Group";
            warningMessage = `${cohortName} doesn't have any assigned classes`;
            break;
          }
        }
      }

      if (warningMessage) {
        warnings.set(course.id, warningMessage);
      }
    });
    return warnings;
  }, [courses, enrollments, classes, events, classGroups]);

  // ── Auto-select first course on load / filter change ──
  useEffect(() => {
    if (filteredCourses.length > 0) {
      if (!filteredCourses.find(c => c.id === selectedCourseId)) {
        setSelectedCourseId(filteredCourses[0].id);
      }
    } else {
      setSelectedCourseId(null);
    }
  }, [filteredCourses]);

  // ── Fetch cohorts whenever selected course changes ──
  useEffect(() => {
    if (!selectedCourseId) {
      setCourseCohorts([]);
      setCohortStudentMap({});
      return;
    }
    Promise.all([
      getCourseCohorts(selectedCourseId).catch(() => []),
      getCourseStudents(selectedCourseId).catch(() => []),
    ]).then(([cohorts, courseStudents]) => {
      setCourseCohorts(cohorts || []);
      const map = {};
      (courseStudents || []).forEach(s => { map[s.studentId] = s.classGroupId; });
      setCohortStudentMap(map);
    });
  }, [selectedCourseId]);

  // ── Handlers ──
  const handleSelectCourse = (id) => setSelectedCourseId(id);

  const handleCreateCourse = async () => {
    try {
      await courseService.createCourse({
        name: courseForm.name,
        code: courseForm.code || null,
        teacherId: courseForm.teacherId,
        term: courseForm.term,
        year: parseInt(courseForm.year),
        capacity: parseInt(courseForm.capacity),
      });
      setShowCreateModal(false);
      setCourseForm(DEFAULT_COURSE_FORM);
      await fetchData();
    } catch (err) {
      alert("Failed to create course: " + err.message);
    }
  };

  const handleSaveLecturer = async ({ firstName, lastName, email, tempPassword }) => {
    try {
      await registrationService.registerTeacher({ firstName, lastName, email, tempPassword });
      setIsAddingLecturer(false);
      await fetchData();
    } catch (err) {
      alert("Failed to create lecturer: " + err.message);
    }
  };



  const handleSendNotification = async ({ title, description, startTime, endTime, selectedIds, eventType, bgColor, textColor }) => {
    try {
      const targetCourses = courses.filter(c => selectedIds.includes(c.lecturerId));
      if (targetCourses.length === 0) {
        alert("The selected lecturers have no courses in the current filter. No events created.");
        return;
      }
      await Promise.all(
        targetCourses.map(c =>
          createEvent({ title, description, eventType, startTime, endTime, bgColor, textColor, courseId: c.id })
        )
      );
      setIsSendingNotification(false);
    } catch (err) {
      alert("Failed to send notification: " + err.message);
    }
  };

  const handleCreateStudent = async ({ firstName, lastName, email, tempPassword }) => {
    try {
      const newUser = await registrationService.registerStudent({ firstName, lastName, email, tempPassword });
      const studentId = newUser?.id || newUser?.userId;
      if (selectedCourseId && studentId) {
        await enrollmentService.create({ studentId, courseId: selectedCourseId, status: "Active" });
      }
      setIsAddingStudent(false);
      await fetchData();
    } catch (err) {
      alert("Failed to create student: " + err.message);
    }
  };

  const handleEditUser = async ({ firstName, lastName, email }) => {
    if (!editingUser) return;
    try {
      await userService.updateUser(editingUser.user.id, {
        ...editingUser.user,
        firstName,
        lastName,
        email,
      });
      setEditingUser(null);
      await fetchData();
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  const handleDeleteLecturer = async (lecturer) => {
    if (!window.confirm(`Delete lecturer "${lecturer.name}"? This will permanently remove their account.`)) return;
    try {
      await userService.deleteUser(lecturer.id);
      await fetchData();
    } catch (err) {
      alert("Failed to delete lecturer: " + err.message);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Remove "${student.name}" from this course?`)) return;
    try {
      const enrollment = enrollments.find(
        (e) => e.student?.id === student.id && e.courseId === selectedCourseId
      );
      if (!enrollment) throw new Error("Enrollment not found");
      await enrollmentService.deleteEnrollment(enrollment.id);
      await fetchData();
    } catch (err) {
      alert("Failed to remove student: " + err.message);
    }
  };

  // ── Header KPIs ──
  const currentTermCourses = useMemo(
    () => courses.filter(c => c.year === parseInt(year) && c.semester === parseInt(semester)),
    [courses, year, semester]
  );

  const enrolledStudentCount = useMemo(() => {
    const courseIds = new Set(currentTermCourses.map(c => c.id));
    const ids = new Set();
    students.forEach(s => { if (s.courseIds.some(cid => courseIds.has(cid))) ids.add(s.id); });
    return ids.size;
  }, [students, currentTermCourses]);

  const activeLecturerCount = useMemo(
    () => new Set(currentTermCourses.map(c => c.lecturerId)).size,
    [currentTermCourses]
  );

  const headerStats = [
    { icon: UserCheck, label: "Active Lecturers", value: activeLecturerCount, variant: "purple" },
    { icon: BookOpen, label: "Courses This Term", value: currentTermCourses.length, variant: "sky" },
    { icon: GraduationCap, label: "Enrolled Students", value: enrolledStudentCount, variant: "emerald" },
    { icon: Users, label: "Total Lecturers", value: lecturers.length, variant: "orange" },
  ];

  const headerActions = (
    <>
      <FilterDropdown
        label="Year"
        value={year}
        onChange={setYear}
        options={availableYears.map(y => ({ value: y, label: y }))}
      />
      <FilterDropdown
        label="Semester"
        value={semester}
        onChange={setSemester}
        options={[{ value: "1", label: "1" }, { value: "2", label: "2" }]}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-6 pb-2">
      <DashboardHeader
        stats={headerStats}
        loading={isLoading}
        actions={headerActions}
        contextLine={`Managing ${year || "—"} · Semester ${semester}.`}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-[1400px] mx-auto min-h-[520px] animate-pulse">
          {/* Column 1 — course list */}
          <div className="flex flex-col gap-3 bg-white rounded-[28px] p-5 shadow-sm border border-gray-100">
            <div className="h-5 rounded-full bg-gray-200 w-24 mb-1" />
            <div className="h-8 rounded-2xl bg-gray-100 w-full mb-2" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100" />
            ))}
          </div>
          {/* Column 2 — lecturer */}
          <div className="flex flex-col gap-3 bg-white rounded-[28px] p-5 shadow-sm border border-gray-100">
            <div className="h-5 rounded-full bg-gray-200 w-28 mb-1" />
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#3C0078]/10 mt-2">
              <div className="w-10 h-10 rounded-full bg-[#3C0078]/20 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-2 rounded-full bg-[#3C0078]/20 w-2/5" />
                <div className="h-3 rounded-full bg-[#3C0078]/20 w-3/5" />
              </div>
            </div>
          </div>
          {/* Column 3 — student list */}
          <div className="flex flex-col gap-3 bg-white rounded-[28px] p-5 shadow-sm border border-gray-100">
            <div className="h-5 rounded-full bg-gray-200 w-28 mb-1" />
            <div className="h-8 rounded-2xl bg-gray-100 w-full mb-2" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 rounded-full bg-gray-200" style={{ width: `${45 + i * 12}%` }} />
                  <div className="h-3 rounded-full bg-gray-100 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <motion.section
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
          }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-[1400px] mx-auto h-[68vh] min-h-[520px]"
          aria-label="Admin dashboard overview"
        >
          {/* Column 1: Courses */}
          <motion.div variants={column} className="min-h-0 h-full">
            <CourseColumn
              courseSearch={courseSearch}
              setCourseSearch={setCourseSearch}
              filteredCourses={filteredCourses}
              selectedCourseId={selectedCourseId}
              handleSelectCourse={handleSelectCourse}
              lecturers={lecturers}
              onAddCourse={() => setShowCreateModal(true)}
              isAddingCourse={showCreateModal}
              warningCourseDetails={warningCourseDetails}
            />
          </motion.div>

          {/* Column 2: Lecturer for selected course */}
          <motion.div variants={column} className="min-h-0 h-full">
            <LecturerColumn
              lecturer={courseLecturer}
              selectedCourseId={selectedCourseId}
              isAddingLecturer={isAddingLecturer}
              setIsAddingLecturer={setIsAddingLecturer}
              onOpenNotification={() => setIsSendingNotification(true)}
              onEditLecturer={(l) => setEditingUser({ user: l, label: "Lecturer" })}
              onDeleteLecturer={handleDeleteLecturer}
            />
          </motion.div>

          {/* Column 3: Students for selected course */}
          <motion.div variants={column} className="min-h-0 h-full">
            <StudentColumn
              showAddStudent={!!selectedCourseId}
              isAddingStudent={isAddingStudent}
              setIsAddingStudent={setIsAddingStudent}
              studentSearch={studentSearch}
              setStudentSearch={setStudentSearch}
              selectedCourseId={selectedCourseId}
              filteredStudents={filteredStudents}
              cohorts={courseCohorts}
              cohortStudentMap={cohortStudentMap}
              onEditStudent={(s) => setEditingUser({ user: s, label: "Student" })}
              onDeleteStudent={handleDeleteStudent}
            />
          </motion.div>
        </motion.section>
      )}



      {/* ── Create Course Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCourseModal
            show={showCreateModal}
            onClose={() => { setShowCreateModal(false); setCourseForm(DEFAULT_COURSE_FORM); }}
            form={courseForm}
            setForm={setCourseForm}
            teachers={createTeachers}
            onCreate={handleCreateCourse}
          />
        )}
      </AnimatePresence>

      {/* ── Add Lecturer Modal ── */}
      <AnimatePresence>
        {isAddingLecturer && (
          <AddLecturerForm
            onSave={handleSaveLecturer}
            onCancel={() => setIsAddingLecturer(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Add Student Modal ── */}
      <AnimatePresence>
        {isAddingStudent && (
          <AddStudentForm
            onSave={handleCreateStudent}
            onCancel={() => setIsAddingStudent(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Send Notification Modal ── */}
      <AnimatePresence>
        {isSendingNotification && (
          <SendNotificationModal
            lecturers={lecturers}
            onClose={() => setIsSendingNotification(false)}
            onSend={handleSendNotification}
          />
        )}
      </AnimatePresence>

      {/* ── Edit User Modal ── */}
      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser.user}
            label={editingUser.label}
            onSave={handleEditUser}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
