import React from "react";
import { ExternalLink, Image, Plus, Presentation, Trash2, Upload } from "lucide-react";
import { ensureHttps, isProjectAssetUrl, isProjectImageUrl, updateList } from "../pages/profile/profileUtils";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";
const INPUT_CLASS =
  "w-full text-xs rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 text-gray-900";
const LABEL_CLASS =
  "text-gray-700 font-bold text-[10px] uppercase tracking-wider mb-1 block";

export default function ProfilePortfolio({
  profile,
  editMode,
  updateProfile,
  attachProjectImage,
  attachProjectDocument,
  onProjectImageDrop,
  uploadError,
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="rounded-xl bg-brand/5 p-2 text-brand">
          <Presentation size={20} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Showcase Portfolio</h2>
      </div>

      {uploadError ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs font-semibold text-amber-800 shadow-3xs">
          {uploadError}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {profile.projects.map((project, index) => (
          <article
            key={`project-${index}`}
            className="rounded-[24px] border border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30 p-5 shadow-3xs transition hover:-translate-y-0.5 hover:shadow-2xs"
          >
            {/* Preview image */}
            <div className="mb-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-3xs">
              {project.mediaUrl && isProjectImageUrl(project.mediaUrl) ? (
                <img
                  src={project.mediaUrl}
                  alt={project.title || "Project preview"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
                  <Image size={16} /> Add image or media URL
                </span>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3.5">
                <div>
                  <label className={LABEL_CLASS}>Project Title</label>
                  <input
                    value={project.title}
                    onChange={(e) =>
                      updateProfile(
                        "projects",
                        updateList(profile.projects, index, { ...project, title: e.target.value })
                      )
                    }
                    placeholder="Project title"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Project Description</label>
                  <textarea
                    value={project.description}
                    onChange={(e) =>
                      updateProfile(
                        "projects",
                        updateList(profile.projects, index, {
                          ...project,
                          description: e.target.value,
                        })
                      )
                    }
                    placeholder="Brief project description"
                    rows={3}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Media URL (Preview Image)</label>
                  <input
                    value={project.mediaUrl}
                    onChange={(e) =>
                      updateProfile(
                        "projects",
                        updateList(profile.projects, index, {
                          ...project,
                          mediaUrl: ensureHttps(e.target.value),
                        })
                      )
                    }
                    placeholder="Media URL (image/video preview)"
                    className={INPUT_CLASS}
                  />
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onProjectImageDrop(index, e)}
                  className="rounded-xl border border-dashed border-gray-300 bg-gray-50/40 px-3 py-3.5 text-center text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Drag and drop an image here, or use the button below.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition hover:scale-[1.02] shadow-3xs">
                    <Upload size={13} />
                    <span>Upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const [file] = Array.from(e.target.files || []);
                        attachProjectImage(index, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {project.mediaName ? (
                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                      {project.mediaName}
                    </span>
                  ) : null}
                </div>
                <div>
                  <label className={LABEL_CLASS}>Project Resource Link</label>
                  <input
                    value={project.projectUrl}
                    onChange={(e) =>
                      updateProfile(
                        "projects",
                        updateList(profile.projects, index, {
                          ...project,
                          projectUrl: ensureHttps(e.target.value),
                        })
                      )
                    }
                    placeholder="Project link (PDF / Video / Repo)"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition hover:scale-[1.02] shadow-3xs">
                    <Upload size={13} />
                    <span>Upload PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const [file] = Array.from(e.target.files || []);
                        attachProjectDocument(index, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {project.projectFileName ? (
                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                      {project.projectFileName}
                    </span>
                  ) : null}
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      updateProfile(
                        "projects",
                        profile.projects.filter((_, i) => i !== index)
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-red-700 transition hover:bg-red-50 hover:border-red-300 hover:scale-[1.02]"
                  >
                    <Trash2 size={13} />
                    <span>Remove project</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-[140px]">
                <h3 className="text-lg font-extrabold tracking-tight text-gray-900">
                  {project.title || "Untitled project"}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600 flex-1">{project.description}</p>
                {isProjectAssetUrl(project.projectUrl) ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                      href={project.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-2 text-xs font-black uppercase tracking-wider text-brand hover:bg-purple-50 transition hover:scale-[1.02] shadow-3xs"
                    >
                      <span>Open {project.projectFileName || "project"}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </article>
        ))}
      </div>

      {editMode ? (
        <button
          type="button"
          onClick={() =>
            updateProfile("projects", [
              ...profile.projects,
              {
                title: "",
                description: "",
                mediaUrl: "",
                mediaName: "",
                projectUrl: "",
                projectFileName: "",
              },
            ])
          }
          className="mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border-2 border-brand bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-brand hover:bg-brand hover:text-white transition hover:scale-[1.02] cursor-pointer"
        >
          <Plus size={14} />
          <span>Add project</span>
        </button>
      ) : null}
    </section>
  );
}
