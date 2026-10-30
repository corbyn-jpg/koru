import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  UserRound,
  Presentation,
  Sparkles,
  GraduationCap,
  Briefcase,
  Link as LinkIcon,
  Eye,
  Upload,
  Palette
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ProfileHeader from "../../components/ProfileHeader";
import ProfilePortfolio from "../../components/ProfilePortfolio";
import ProfileSkills from "../../components/ProfileSkills";
import ProfileExperience from "../../components/ProfileExperience";
import ProfileEducation from "../../components/ProfileEducation";
import ProfileLinks from "../../components/ProfileLinks";

import {
  LINK_FIELD_CONFIG,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_PDF_FILE_SIZE_BYTES,
  PRIVACY_SECTION_CONFIG,
  PROFILE_LAST_ROLE_KEY,
  PROFILE_STORAGE_PREFIX,
  PUBLIC_PROFILE_INDEX_KEY,
} from "./profileConfig";
import {
  buildDefaultProfile,
  fileToDataUrl,
  getExperienceGroups,
  getFileSizeError,
  getLinkEntries,
  getSkillGroups,
  isValidUrl,
  normalizeProfileSnapshot,
  persistProfileSnapshot,
  slugify,
  ensureHttps
} from "./profileUtils";
import { exportProfileToPdf } from "./profilePdf";

export default function Profile({ publicRoute = false }) {
  const { slug: routeSlug } = useParams();
  const { user: session, role } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Role & user scope
  const liveRoleScope = useMemo(() => {
    const raw = String(role || "").trim().toLowerCase();
    return raw === "teacher" || raw === "student" ? raw : "";
  }, [role]);

  const [stableRoleScope, setStableRoleScope] = useState(() => {
    const remembered = String(localStorage.getItem(PROFILE_LAST_ROLE_KEY) || "").trim().toLowerCase();
    return remembered === "teacher" || remembered === "student" ? remembered : "student";
  });

  useEffect(() => {
    if (!liveRoleScope) return;
    setStableRoleScope(liveRoleScope);
    localStorage.setItem(PROFILE_LAST_ROLE_KEY, liveRoleScope);
  }, [liveRoleScope]);

  const roleLabel = stableRoleScope === "teacher" ? "Teacher" : "Student";

  const liveUserScope = useMemo(
    () => String(session?.userId || session?.email || "").trim().toLowerCase(),
    [session?.userId, session?.email],
  );

  const [stableUserScope, setStableUserScope] = useState(liveUserScope || "anonymous");

  useEffect(() => {
    if (liveUserScope) setStableUserScope(liveUserScope);
  }, [liveUserScope]);

  const profileStorageKey = useMemo(
    () => `${PROFILE_STORAGE_PREFIX}.${stableUserScope}.${stableRoleScope}`,
    [stableUserScope, stableRoleScope],
  );

  // UI state
  const [editMode, setEditMode] = useState(false);
  const [viewAsPublic, setViewAsPublic] = useState(publicRoute);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [publicNotFound, setPublicNotFound] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [profile, setProfile] = useState(() => buildDefaultProfile(stableRoleScope, session));

  // Derived values
  const shareUrl = useMemo(() => {
    const slug = slugify(profile.vanityUrlSlug) || "profile";
    return `${window.location.origin}/profile/${slug}`;
  }, [profile.vanityUrlSlug]);

  const linkEntries = useMemo(() => getLinkEntries(profile.links), [profile.links]);
  const skillGroups = useMemo(() => getSkillGroups(profile.skills), [profile.skills]);
  const experienceGroups = useMemo(
    () => getExperienceGroups(profile.experience, roleLabel),
    [profile.experience, roleLabel],
  );
  const validLinks = useMemo(
    () => linkEntries.filter(([, url]) => isValidUrl(url)),
    [linkEntries],
  );

  const effectivePrivacy = useMemo(() => {
    if (!viewAsPublic)
      return { header: true, portfolio: true, skills: true, experience: true, education: true, links: true };
    if (!profile.privacy.profilePublic)
      return { header: false, portfolio: false, skills: false, experience: false, education: false, links: false };
    return profile.privacy;
  }, [viewAsPublic, profile.privacy]);

  // Categories list based on privacy / view mode
  const categories = useMemo(() => {
    const list = [];
    
    if (!publicRoute) {
      // Internal Owner view: show all categories
      list.push(
        { id: "profile", label: "Account Profile", icon: <UserRound size={15} /> },
        { id: "portfolio", label: "Showcase Portfolio", icon: <Presentation size={15} /> },
        { id: "skills", label: "Skills Matrix", icon: <Sparkles size={15} /> },
        { id: "experience", label: "Career & Education", icon: <Briefcase size={15} /> },
        { id: "links", label: "Connected Channels", icon: <LinkIcon size={15} /> },
        { id: "visibility", label: "Sharing & Visibility", icon: <Eye size={15} /> }
      );
    } else {
      // Public route: filter based on effective privacy
      if (effectivePrivacy.header) {
        list.push({ id: "profile", label: "Account Profile", icon: <UserRound size={15} /> });
      }
      if (effectivePrivacy.portfolio) {
        list.push({ id: "portfolio", label: "Showcase Portfolio", icon: <Presentation size={15} /> });
      }
      if (effectivePrivacy.skills) {
        list.push({ id: "skills", label: "Skills Matrix", icon: <Sparkles size={15} /> });
      }
      if (effectivePrivacy.experience || effectivePrivacy.education) {
        list.push({ id: "experience", label: "Career & Education", icon: <Briefcase size={15} /> });
      }
      if (effectivePrivacy.links) {
        list.push({ id: "links", label: "Connected Channels", icon: <LinkIcon size={15} /> });
      }
    }
    
    return list;
  }, [publicRoute, effectivePrivacy]);

  // Adjust active tab if it becomes invisible in public view
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some((c) => c.id === activeTab);
      if (!exists) {
        setActiveTab(categories[0].id);
      }
    }
  }, [categories, activeTab]);

  // Page Classes matching Settings
  const pageClasses = useMemo(
    () => ({
      wrapper: "text-slate-900 font-sans",
      card: "border border-gray-200/50 bg-white p-6 shadow-2xs rounded-[30px] hover:shadow-xs transition duration-300",
      muted: "text-gray-500 font-medium text-xs leading-relaxed",
      input: "w-full text-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 text-gray-900",
      label: "text-gray-700 font-bold text-xs uppercase tracking-wider mb-1.5 block",
    }),
    [],
  );

  // Effects
  useEffect(() => {
    if (publicRoute) {
      setViewAsPublic(true);
      setEditMode(false);
    }
  }, [publicRoute]);

  useEffect(() => {
    setHasLoadedProfile(false);

    if (publicRoute) {
      try {
        const index = JSON.parse(localStorage.getItem(PUBLIC_PROFILE_INDEX_KEY) || "{}");
        const entry = index?.[routeSlug || ""];
        if (!entry?.storageKey) { setPublicNotFound(true); setHasLoadedProfile(true); return; }
        const parsed = JSON.parse(localStorage.getItem(entry.storageKey) || "null");
        if (!parsed) { setPublicNotFound(true); setHasLoadedProfile(true); return; }
        setPublicNotFound(false);
        setProfile(normalizeProfileSnapshot(parsed, stableRoleScope, session));
        setHasLoadedProfile(true);
      } catch {
        setPublicNotFound(true);
        setHasLoadedProfile(true);
      }
      return;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(profileStorageKey) || "null");
      if (parsed) {
        setProfile(normalizeProfileSnapshot(parsed, stableRoleScope, session));
        setHasLoadedProfile(true);
        return;
      }
    } catch {
      // Malformed localStorage - fall back to defaults.
    }

    setProfile(buildDefaultProfile(stableRoleScope, session));
    setHasLoadedProfile(true);
  }, [
    publicRoute, routeSlug, profileStorageKey, stableRoleScope,
    session?.userId, session?.email, session?.firstName, session?.lastName, session?.profileImageUrl,
  ]);

  useEffect(() => {
    if (publicRoute || !hasLoadedProfile) return;

    const { error } = persistProfileSnapshot(profileStorageKey, profile, stableRoleScope, session);
    setSaveError(error);

    try {
      const slug = slugify(profile.vanityUrlSlug) || "profile";
      const index = JSON.parse(localStorage.getItem(PUBLIC_PROFILE_INDEX_KEY) || "{}");
      Object.keys(index).forEach((s) => {
        if (index[s]?.storageKey === profileStorageKey) delete index[s];
      });
      if (profile.privacy.profilePublic) {
        index[slug] = { storageKey: profileStorageKey, role: stableRoleScope, updatedAt: Date.now() };
      }
      localStorage.setItem(PUBLIC_PROFILE_INDEX_KEY, JSON.stringify(index));
    } catch {
      // Ignore index errors.
    }
  }, [publicRoute, hasLoadedProfile, profileStorageKey, profile, stableRoleScope]);

  // Handlers
  function updateProfile(path, value) {
    if (publicRoute) return;
    setProfile((current) => {
      const copy = JSON.parse(JSON.stringify(current));
      const parts = path.split(".");
      let target = copy;
      while (parts.length > 1) {
        const part = parts.shift();
        if (!target[part]) target[part] = {};
        target = target[part];
      }
      target[parts[0]] = value;
      return copy;
    });
  }

  function toggleVisibility(key) {
    updateProfile(`privacy.${key}`, !profile.privacy[key]);
  }

  async function handlePdfExport() {
    try {
      setIsExporting(true);
      setSaveError("");
      const safeFileName = slugify(profile.header.fullName || "profile") || "profile";
      exportProfileToPdf(profile, roleLabel, validLinks, `${safeFileName}-cv`);
    } catch {
      setSaveError("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function attachProjectImage(index, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please upload a valid image file."); return; }
    const sizeError = getFileSizeError(file, MAX_IMAGE_FILE_SIZE_BYTES, "Image");
    if (sizeError) { setUploadError(sizeError); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!profile.projects[index]) return;
      setUploadError("");
      updateProfile("projects", profile.projects.map((p, i) =>
        i === index ? { ...p, mediaUrl: dataUrl, mediaName: file.name } : p
      ));
    } catch {
      setUploadError("Unable to read the selected image. Please try a different file.");
    }
  }

  async function attachProjectDocument(index, file) {
    if (!file) return;
    if (file.type !== "application/pdf") { setUploadError("Please upload a PDF document."); return; }
    const sizeError = getFileSizeError(file, MAX_PDF_FILE_SIZE_BYTES, "PDF");
    if (sizeError) { setUploadError(sizeError); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!profile.projects[index]) return;
      setUploadError("");
      updateProfile("projects", profile.projects.map((p, i) =>
        i === index ? { ...p, projectUrl: dataUrl, projectFileName: file.name } : p
      ));
    } catch {
      setUploadError("Unable to read the selected PDF. Please try a different file.");
    }
  }

  function onProjectImageDrop(index, event) {
    event.preventDefault();
    const [file] = Array.from(event.dataTransfer?.files || []);
    attachProjectImage(index, file);
  }

  async function attachProfileImage(file) {
    if (publicRoute || !file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please upload a valid profile image file."); return; }
    const sizeError = getFileSizeError(file, MAX_IMAGE_FILE_SIZE_BYTES, "Profile image");
    if (sizeError) { setUploadError(sizeError); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      updateProfile("header.photoUrl", dataUrl);
      updateProfile("header.photoName", file.name);
      setUploadError("");
    } catch {
      setUploadError("Unable to read the selected profile image. Please try a different file.");
    }
  }

  const activeTabLabel = useMemo(() => {
    const found = categories.find((c) => c.id === activeTab);
    return found ? found.label : "Profile";
  }, [activeTab, categories]);

  return (
    <div data-tts-root="true" className={`flex overflow-hidden gap-4 transition duration-300 md:h-[calc(100vh-32px)] md:w-full max-md:h-screen max-md:w-screen max-md:-ml-4 max-md:-mr-4 max-md:-mt-4 bg-transparent ${pageClasses.wrapper}`}>
      <div className="flex h-full w-full gap-4 overflow-hidden">
        {/* Left Section: Floating Profile Secondary Navigation (Matching Courses & Settings) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col shrink-0 transition duration-300
            md:h-full md:w-64 md:bg-white/70 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg md:overflow-hidden
            max-md:h-full max-md:w-64 max-md:bg-white/80 max-md:backdrop-blur-md max-md:border-r max-md:border-gray-200/50"
        >
          {/* Profile Sidebar Header Info */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-200 flex flex-col gap-2 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-brand/10 text-brand font-black text-[9px] uppercase tracking-wider shadow-sm">
                {roleLabel}
              </span>
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">
                Portfolio
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-gray-900 leading-snug mt-1 truncate">
              My Profile
            </h3>
          </div>

          {/* Navigation links */}
          <div className="flex-1 overflow-y-auto pt-4 pb-6 scrollbar-hide">
            {categories.length === 0 ? (
              <p className="px-6 text-xs text-gray-400 italic">No public sections visible.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {categories.map((cat, index) => {
                  const isActive = activeTab === cat.id;
                  return (
                    <motion.li
                      key={cat.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="list-none group relative"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(cat.id);
                          setSaveError("");
                          setUploadError("");
                        }}
                        className={`relative w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition duration-200 mx-3 my-0.5 rounded-xl group select-none cursor-pointer text-left
                          ${isActive
                            ? "bg-brand/5 text-brand"
                            : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
                          }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeProfileLeftAccent"
                            className="absolute left-0 top-1/4 bottom-1/4 w-0.75 bg-brand rounded-r-md shrink-0"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30
                            }}
                          />
                        )}

                        <span className={`transition-colors shrink-0 ${isActive ? "text-brand" : "text-gray-400 group-hover:text-gray-600"}`}>
                          {cat.icon}
                        </span>
                        
                        <span className="flex-1 truncate !text-inherit">{cat.label}</span>

                        {isActive && (
                          <motion.div
                            layoutId="activeProfileDot"
                            className="w-1.5 h-1.5 rounded-full bg-brand shrink-0"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30
                            }}
                          />
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Right Section: Main Content Area: Floating Island Card */}
        <div className="flex-1 flex flex-col overflow-hidden transition duration-300 md:bg-white/75 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-[28px] md:shadow-lg max-md:bg-white">
          {/* Header Top Bar */}
          <div className="h-14 border-b border-gray-200 bg-white/60 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white bg-brand shadow-sm">
                University Portfolio
              </span>
              <span className="text-gray-300 text-xs">/</span>
              <span className="text-xs font-bold text-gray-500 capitalize">{activeTabLabel}</span>
            </div>

            {/* Owner Actions */}
            {!publicRoute && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer shadow-3xs hover:scale-[1.02] border
                    ${editMode
                      ? "bg-brand border-brand text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {editMode ? "Save & View" : "Edit Profile"}
                </button>
                
                <button
                  type="button"
                  onClick={() => window.open(`/profile/p/${profile.vanityUrlSlug || "default"}`)}
                  className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition duration-200 cursor-pointer shadow-3xs hover:scale-[1.02]"
                >
                  Public Preview
                </button>
                
                <button
                  type="button"
                  onClick={handlePdfExport}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:scale-[1.02] transition cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  {isExporting ? "Exporting..." : "Export CV"}
                </button>
              </div>
            )}
          </div>

          {/* Scrollable View Content */}
          <div className="flex-1 overflow-y-auto pt-8 px-8 pb-12">
            <div className="w-full flex flex-col gap-6">
              {publicRoute && publicNotFound ? (
                <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
                  <p className="text-sm font-semibold">This shared profile could not be found.</p>
                  <p className="mt-1 text-sm">The link may be invalid, private, or no longer available.</p>
                </section>
              ) : null}

              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-3xs">
                  {saveError}
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  {activeTab === "profile" && effectivePrivacy.header && (
                    <>
                      <ProfileHeader profile={profile} roleLabel={roleLabel} />

                      {editMode && (
                        <div className={pageClasses.card}>
                          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
                            <span className="rounded-xl bg-brand/5 p-2 text-brand"><UserRound size={20} /></span>
                            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Edit Profile Identity</h2>
                          </div>
                          
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className={pageClasses.label}>Full Name</label>
                              <input
                                value={profile.header.fullName}
                                onChange={(e) => updateProfile("header.fullName", e.target.value)}
                                placeholder="Full name"
                                className={pageClasses.input}
                              />
                            </div>
                            <div>
                              <label className={pageClasses.label}>Professional Headline</label>
                              <input
                                value={profile.header.headline}
                                onChange={(e) => updateProfile("header.headline", e.target.value)}
                                placeholder="Professional headline"
                                className={pageClasses.input}
                              />
                            </div>
                            <div>
                              <label className={pageClasses.label}>Major / Faculty</label>
                              <input
                                value={profile.header.major}
                                onChange={(e) => updateProfile("header.major", e.target.value)}
                                placeholder="Major / Faculty"
                                className={pageClasses.input}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={pageClasses.label}>Degree</label>
                                <input
                                  value={profile.header.degree}
                                  onChange={(e) => updateProfile("header.degree", e.target.value)}
                                  placeholder="Degree"
                                  className={pageClasses.input}
                                />
                              </div>
                              <div>
                                <label className={pageClasses.label}>Graduation Year</label>
                                <input
                                  value={profile.header.expectedGraduation}
                                  onChange={(e) => updateProfile("header.expectedGraduation", e.target.value)}
                                  placeholder="Expected graduation"
                                  className={pageClasses.input}
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={pageClasses.label}>Email Address</label>
                              <input
                                value={profile.header.email}
                                onChange={(e) => updateProfile("header.email", e.target.value)}
                                placeholder="Email address"
                                className={`${pageClasses.input} disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed`}
                                disabled
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={pageClasses.label}>Profile Photo URL</label>
                              <input
                                value={profile.header.photoUrl}
                                onChange={(e) => updateProfile("header.photoUrl", e.target.value)}
                                placeholder="Profile photo URL (or upload below)"
                                className={pageClasses.input}
                              />
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-2">
                              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border-2 border-brand bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-brand hover:bg-brand hover:text-white transition hover:scale-[1.02]">
                                <Upload size={14} />
                                <span>Upload profile image</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const [file] = Array.from(e.target.files || []);
                                    attachProfileImage(file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {profile.header.photoName ? (
                                <p className="text-xs text-gray-500 font-medium">Uploaded: {profile.header.photoName}</p>
                              ) : null}
                            </div>
                            <div className="sm:col-span-2">
                              <label className={pageClasses.label}>Professional Summary</label>
                              <textarea
                                value={profile.header.summary}
                                onChange={(e) => updateProfile("header.summary", e.target.value)}
                                rows={4}
                                placeholder="2-3 sentence professional summary visible to recruiters"
                                className={pageClasses.input}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "portfolio" && effectivePrivacy.portfolio && (
                    <ProfilePortfolio
                      profile={profile}
                      editMode={editMode}
                      updateProfile={updateProfile}
                      attachProjectImage={attachProjectImage}
                      attachProjectDocument={attachProjectDocument}
                      onProjectImageDrop={onProjectImageDrop}
                      uploadError={uploadError}
                    />
                  )}

                  {activeTab === "skills" && effectivePrivacy.skills && (
                    <ProfileSkills skillGroups={skillGroups} editMode={editMode} updateProfile={updateProfile} />
                  )}

                  {activeTab === "experience" && (
                    <div className="flex flex-col gap-6">
                      {effectivePrivacy.experience && (
                        <ProfileExperience experienceGroups={experienceGroups} editMode={editMode} updateProfile={updateProfile} />
                      )}

                      {effectivePrivacy.education && (
                        <ProfileEducation profile={profile} editMode={editMode} updateProfile={updateProfile} />
                      )}
                    </div>
                  )}

                  {activeTab === "links" && effectivePrivacy.links && (
                    <div className="flex flex-col gap-6">
                      <ProfileLinks linkEntries={linkEntries} />

                      {editMode && (
                        <div className={pageClasses.card}>
                          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
                            <span className="rounded-xl bg-brand/5 p-2 text-brand"><Palette size={20} /></span>
                            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Manage Platform Links</h2>
                          </div>
                          
                          <div className="grid gap-4 sm:grid-cols-2">
                            {LINK_FIELD_CONFIG.map(({ key, label, placeholder }) => (
                              <div key={key}>
                                <label className={pageClasses.label}>{label}</label>
                                <input
                                  value={profile.links[key]}
                                  onChange={(e) => updateProfile(`links.${key}`, ensureHttps(e.target.value))}
                                  placeholder={placeholder}
                                  className={pageClasses.input}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "visibility" && !publicRoute && (
                    <div className={pageClasses.card}>
                      <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
                        <span className="rounded-xl bg-brand/5 p-2 text-brand"><Eye size={20} /></span>
                        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Privacy &amp; Visibility Checklist</h2>
                      </div>
                      
                      <p className={`${pageClasses.muted} mb-5`}>
                        Control which sections are displayed to recruiters on your public dashboard.
                      </p>
                      
                      <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/40 p-4 hover:bg-gray-50 transition-colors duration-200 shadow-3xs">
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-gray-900 tracking-tight">Public Profile Visibility</span>
                          <span className="text-[11px] text-gray-500 font-medium">Allow search engines and recruiters to find you</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={profile.privacy.profilePublic}
                          onChange={() => toggleVisibility("profilePublic")}
                          className="h-5 w-5 cursor-pointer accent-brand shrink-0"
                        />
                      </label>

                      <div className="space-y-2">
                        {PRIVACY_SECTION_CONFIG.map(([key, label]) => (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50/20 px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors duration-200"
                          >
                            <span className="text-xs font-bold text-gray-700">{label}</span>
                            <input
                              type="checkbox"
                              checked={profile.privacy[key]}
                              onChange={() => toggleVisibility(key)}
                              className="h-4 w-4 cursor-pointer accent-brand shrink-0"
                            />
                          </label>
                        ))}
                      </div>

                      {editMode && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <label className={pageClasses.label}>Vanity URL slug</label>
                          <input
                            value={profile.vanityUrlSlug}
                            onChange={(e) => updateProfile("vanityUrlSlug", slugify(e.target.value))}
                            placeholder="e.g. johndoe"
                            className={pageClasses.input}
                          />
                        </div>
                      )}

                      <div className="mt-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-indigo-50/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-brand">
                          Shareable Link
                        </p>
                        <p className="mt-1.5 break-all text-xs font-bold text-gray-700 font-mono select-all bg-white/85 px-3 py-2.5 rounded-xl border border-purple-100/50 shadow-3xs">{shareUrl}</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition hover:scale-[1.02] shadow-3xs cursor-pointer"
                        >
                          <span>{copied ? "Copied!" : "Copy link"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!profile.privacy.profilePublic && viewAsPublic ? (
                    <section className="rounded-[28px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 text-amber-900 shadow-sm">
                      <p className="text-sm font-semibold">This profile is currently private.</p>
                      <p className="mt-1 text-sm">
                        Recruiters and public viewers will not see this profile until you enable public visibility.
                      </p>
                    </section>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
