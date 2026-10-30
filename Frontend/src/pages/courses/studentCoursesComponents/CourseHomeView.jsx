import React from "react";
import PageCanvas from "../../../components/PageCanvas";
import { getCourseById, getCourseLecturers } from "../../../services/courseService";
import { Loader } from "lucide-react";

export default function CourseHomeView({ subject, course, loading }) {
  const [pageLoading, setPageLoading] = React.useState(true);
  const [sections, setSections] = React.useState([]);
  const [lecturers, setLecturers] = React.useState([]);
  
  // Cover Image States
  const [showCoverImage, setShowCoverImage] = React.useState(true);
  const [coverImageUrl, setCoverImageUrl] = React.useState("");

  // Initialize course default sections (Overview)
  const makeDefaultSections = () => {
    return [
      {
        id: `text-overview`,
        type: "text",
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Course Overview" }]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: subject?.description || "Welcome to the course homepage! There is currently no custom content published for this course."
                }
              ]
            }
          ]
        }
      }
    ];
  };

  React.useEffect(() => {
    if (!course?.id) return;
    let mounted = true;
    setPageLoading(true);

    // Fetch course details (content) and lecturers
    Promise.all([
      getCourseById(course.id),
      getCourseLecturers(course.id)
    ])
      .then(([courseData, lecturersData]) => {
        if (!mounted) return;
        setLecturers(lecturersData || []);
        
        if (courseData.content) {
          try {
            const parsed = JSON.parse(courseData.content);
            setSections(parsed.sections || []);
            
            // Extract cover image settings
            if (parsed.settings) {
              setShowCoverImage(parsed.settings.showCoverImage !== false);
              setCoverImageUrl(parsed.settings.coverImageUrl || "");
            } else {
              setShowCoverImage(true);
              setCoverImageUrl("");
            }
          } catch (e) {
            console.error("Failed to parse course content", e);
            setSections(makeDefaultSections());
            setShowCoverImage(true);
            setCoverImageUrl("");
          }
        } else {
          setSections(makeDefaultSections());
          setShowCoverImage(true);
          setCoverImageUrl("");
        }
      })
      .catch(err => {
        console.error("Failed to load course home details:", err);
        if (mounted) {
          setSections(makeDefaultSections());
        }
      })
      .finally(() => {
        if (mounted) setPageLoading(false);
      });

    return () => { mounted = false; };
  }, [course?.id]);

  // Use subject imageUrl or a placeholder if not present
  const sampleImg = "https://res.cloudinary.com/dvq3toyi0/image/upload/q_auto/f_auto/v1778533851/AdobeStock_315314252_syaukb.jpg";
  const courseImage = coverImageUrl || subject?.imageUrl || sampleImg;

  return (
    <div className="flex-1 flex flex-col p-12 overflow-y-auto scrollbar-hide">
      <header className="mb-8 select-none">
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-9 rounded-2xl bg-gray-200 w-64" />
            <div className="h-5 rounded-full bg-gray-100 w-20" />
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 leading-tight">
              {subject?.name || "Unknown"}
            </h1>
            <p className="text-xl text-gray-500 mt-2 font-medium">{subject?.code}</p>
          </>
        )}
      </header>

      {pageLoading || loading ? (
        <div className="flex-1 flex flex-col gap-6 animate-pulse">
          <div className="w-full h-[250px] rounded-xl bg-gray-100" />
          <div className="flex flex-col gap-3 mt-2">
            {[85, 70, 90, 55, 75].map((w, i) => (
              <div key={i} className={`h-4 rounded-full ${i % 2 === 0 ? "bg-gray-200" : "bg-gray-100"}`} style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="h-32 rounded-2xl bg-gray-100 mt-2" />
          <div className="flex flex-col gap-3">
            {[60, 80, 45].map((w, i) => (
              <div key={i} className="h-4 rounded-full bg-gray-100" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="flex gap-4 pt-8 border-t border-gray-100 mt-4">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 flex-1">
                <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 rounded-full bg-gray-200 w-28" />
                  <div className="h-3 rounded-full bg-gray-100 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {/* Cover Image */}
          {showCoverImage && (
            <div className="w-full h-[250px] rounded-xl shadow-sm overflow-hidden select-none">
              <img
                src={courseImage}
                alt={subject?.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Main Canvas Viewer (Transparent background) */}
          <div className="flex-1 mt-4">
            <PageCanvas
              sections={sections}
              isEditing={false}
              placeholder="There is no custom content published for this course yet."
            />
          </div>

          {/* Lecturers Grid - Centered & Revamped */}
          <section className="w-full pt-16 pb-12 border-t border-gray-100 flex flex-col items-center mt-12">
            <h4 className="text-[12px] font-black uppercase tracking-wider text-gray-400 mb-8 text-center select-none">
              Lecturer{lecturers.length > 1 ? "s" : ""}
            </h4>
            <div className="flex flex-wrap justify-center gap-8 w-full max-w-4xl">
              {lecturers.map(lecturer => (
                <div key={lecturer.id} className="flex items-center gap-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 p-4 rounded-2xl transition shadow-2xs min-w-[280px]">
                  {/* Profile Image / Initials Fallback */}
                  {lecturer.profileImageUrl ? (
                    <img
                      src={lecturer.profileImageUrl}
                      alt={`${lecturer.firstName} ${lecturer.lastName}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md select-none"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg border-2 border-white shadow-md select-none">
                      {`${lecturer.firstName?.[0] || ""}${lecturer.lastName?.[0] || ""}`.toUpperCase()}
                    </div>
                  )}
                  {/* Name and Email */}
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-gray-900 leading-tight">
                      {lecturer.firstName} {lecturer.lastName}
                    </span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand mt-0.5 select-none">
                      Module Head
                    </span>
                    <a
                      href={`mailto:${lecturer.email}`}
                      className="text-xs text-gray-500 hover:text-brand font-semibold mt-1 break-all transition-colors"
                    >
                      {lecturer.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
