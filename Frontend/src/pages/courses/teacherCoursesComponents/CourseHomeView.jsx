import React from "react";
import PageCanvas from "../../../components/PageCanvas";
import { getCourseById, getCourseLecturers, updateCourseContent } from "../../../services/courseService";
import { uploadImageToCloudinary } from "../../../services/cloudinaryService";
import { Edit3, Save, Loader, Image as ImageIcon } from "lucide-react";

export function CourseHomeView({ subject, course, loading }) {
  const [pageLoading, setPageLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sections, setSections] = React.useState([]);
  const [lecturers, setLecturers] = React.useState([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [saveAlert, setSaveAlert] = React.useState(false);
  
  // Cover Image States
  const [showCoverImage, setShowCoverImage] = React.useState(true);
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [uploadingCover, setUploadingCover] = React.useState(false);

  const canvasRef = React.useRef(null);
  const coverUploadRef = React.useRef(null);

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
                  text: subject?.description || "Welcome to the course homepage! Click Edit to customize the overview, syllabus details, or class instructions."
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
    setIsEditing(false);

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

  const handleSave = async () => {
    if (!canvasRef.current || !course?.id) return;
    const updatedSections = canvasRef.current.getSections();
    setSections(updatedSections);
    setSaving(true);
    try {
      const payload = {
        sections: updatedSections,
        settings: {
          showCoverImage,
          coverImageUrl
        }
      };
      await updateCourseContent(course.id, JSON.stringify(payload));
      setSaveAlert(true);
      setIsEditing(false);
      setTimeout(() => setSaveAlert(false), 2000);
    } catch (err) {
      console.error("Failed to save homepage content:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      setUploadingCover(true);
      const url = await uploadImageToCloudinary(file);
      setCoverImageUrl(url);
    } catch (err) {
      console.error("Cover image upload failed:", err);
    } finally {
      setUploadingCover(false);
    }
  };

  // Use subject imageUrl or a placeholder if not present
  const sampleImg = "https://res.cloudinary.com/dvq3toyi0/image/upload/q_auto/f_auto/v1778533851/AdobeStock_315314252_syaukb.jpg";
  const courseImage = coverImageUrl || subject?.imageUrl || sampleImg;

  return (
    <div className="flex-1 flex flex-col p-12 overflow-y-auto scrollbar-hide">
      <header className="mb-8 flex justify-between items-start select-none">
        <div>
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
        </div>
        {!loading && !pageLoading && (
          <div className="flex items-center gap-4">
            {saveAlert && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-extrabold rounded-xl shadow-2xs border border-green-100 animate-pulse">
                <span>Changes Saved Successfully!</span>
              </div>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl cursor-pointer shadow-2xs border transition disabled:opacity-60 disabled:cursor-not-allowed ${
                isEditing 
                ? "bg-green-600 border-green-700 text-white hover:bg-green-700" 
                : "bg-brand border-brand-deep text-white hover:bg-brand-deep"
              }`}
            >
              {isEditing ? (
                <>
                  {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </>
              ) : (
                <>
                  <Edit3 size={13} />
                  <span>Edit Home Page</span>
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {pageLoading || loading ? (
        <div className="flex-1 flex flex-col gap-6 animate-pulse">
          {/* Cover image skeleton */}
          <div className="w-full h-[250px] rounded-xl bg-gray-100" />
          {/* Content lines */}
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
          {/* Lecturer skeleton */}
          <div className="flex gap-4 pt-8 border-t border-gray-200 mt-4">
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

          {/* Cover Image Toggle & Upload Controls */}
          {isEditing && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl select-none">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-gray-500" />
                <span>Cover Image Settings:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCoverImage(!showCoverImage)}
                className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl border transition cursor-pointer ${
                  showCoverImage
                  ? "bg-purple-50 text-brand border-purple-100 hover:bg-purple-100"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {showCoverImage ? "Hide Cover" : "Show Cover"}
              </button>
              {showCoverImage && (
                <>
                  <input
                    ref={coverUploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <button
                    type="button"
                    onClick={() => coverUploadRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-3xs disabled:opacity-60 transition-colors"
                  >
                    {uploadingCover ? <Loader size={11} className="animate-spin text-gray-400" /> : null}
                    <span>{uploadingCover ? "Uploading…" : "Upload New Cover"}</span>
                  </button>
                </>
              )}
            </div>
          )}
          
          {/* Main Canvas Editor (Transparent background) */}
          <div className="flex-1 mt-4">
            <PageCanvas
              ref={canvasRef}
              sections={sections}
              setSections={setSections}
              isEditing={isEditing}
              placeholder="Customize the course homepage with syllabus outlines, assignments guidelines, and other important course resources..."
            />
          </div>

          {/* Lecturers Grid - Centered & Revamped */}
          <section className="w-full pt-16 pb-12 border-t border-gray-200 flex flex-col items-center mt-12">
            <h4 className="text-[12px] font-black uppercase tracking-wider text-gray-400 mb-8 text-center select-none">
              Lecturer{lecturers.length > 1 ? "s" : ""}
            </h4>
            <div className="flex flex-wrap justify-center gap-8 w-full max-w-4xl">
              {lecturers.map(lecturer => (
                <div key={lecturer.id} className="flex items-center gap-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 p-4 rounded-2xl transition shadow-2xs min-w-[280px]">
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
