import React from "react";
import { Copy, ExternalLink, Link as LinkIcon, Upload, UserRound } from "lucide-react";
import ChipListEditor from "./ChipListEditor";
import { ensureHttps, slugify } from "../pages/profile/profileUtils";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";
const INPUT_CLASS =
  "w-full text-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 transition focus:border-brand/40 focus:outline-none focus:ring-4 focus:ring-brand/10 text-gray-900";
const LABEL_CLASS =
  "text-gray-700 font-bold text-xs uppercase tracking-wider mb-1.5 block";

export default function ProfileSidebar({
  profile,
  editMode,
  updateProfile,
  attachProfileImage,
  shareUrl,
  copied,
  copyShareUrl,
  toggleVisibility,
  privacySectionConfig,
  linkFieldConfig,
}) {
  return (
    <aside className="flex flex-col gap-6">
      {/* Header & Identity */}
      <section className={PANEL_CLASS}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
          <span className="rounded-xl bg-brand/5 p-2 text-brand">
            <UserRound size={20} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Header &amp; Identity</h2>
        </div>

        {editMode ? (
          <div className="grid gap-4">
            <div>
              <label className={LABEL_CLASS}>Full Name</label>
              <input
                value={profile.header.fullName}
                onChange={(e) => updateProfile("header.fullName", e.target.value)}
                placeholder="Full name"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Professional Headline</label>
              <input
                value={profile.header.headline}
                onChange={(e) => updateProfile("header.headline", e.target.value)}
                placeholder="Professional headline"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Major / Faculty</label>
              <input
                value={profile.header.major}
                onChange={(e) => updateProfile("header.major", e.target.value)}
                placeholder="Major / Faculty"
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Degree</label>
                <input
                  value={profile.header.degree}
                  onChange={(e) => updateProfile("header.degree", e.target.value)}
                  placeholder="Degree"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Graduation Year</label>
                <input
                  value={profile.header.expectedGraduation}
                  onChange={(e) => updateProfile("header.expectedGraduation", e.target.value)}
                  placeholder="Expected graduation"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Email Address</label>
              <input
                value={profile.header.email}
                onChange={(e) => updateProfile("header.email", e.target.value)}
                placeholder="Email"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Profile Photo URL</label>
              <input
                value={profile.header.photoUrl}
                onChange={(e) => updateProfile("header.photoUrl", e.target.value)}
                placeholder="Profile photo URL (or upload below)"
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
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
            <div>
              <label className={LABEL_CLASS}>Professional Summary</label>
              <textarea
                value={profile.header.summary}
                onChange={(e) => updateProfile("header.summary", e.target.value)}
                rows={4}
                placeholder="2-3 sentence professional summary visible to recruiters"
                className={INPUT_CLASS}
              />
            </div>
            <ChipListEditor
              title="Verified Digital Badges"
              items={profile.badges}
              onChange={(value) => updateProfile("badges", value)}
              placeholder="Dean's List, Python Certification"
            />
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-500 leading-relaxed">Turn on Edit Profile to update identity details.</p>
        )}
      </section>

      {/* Share & Visibility */}
      <section className={PANEL_CLASS}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
          <span className="rounded-xl bg-brand/5 p-2 text-brand">
            <LinkIcon size={20} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Share &amp; Visibility</h2>
        </div>

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
          {privacySectionConfig.map(([key, label]) => (
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

        {editMode ? (
          <div className="mt-4">
            <label className={LABEL_CLASS}>Vanity URL slug</label>
            <input
              value={profile.vanityUrlSlug}
              onChange={(e) => updateProfile("vanityUrlSlug", slugify(e.target.value))}
              placeholder="e.g. johndoe"
              className={INPUT_CLASS}
            />
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-indigo-50/20 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-brand">
            Shareable Link
          </p>
          <p className="mt-1.5 break-all text-xs font-bold text-gray-700 font-mono select-all bg-white/85 px-3 py-2.5 rounded-xl border border-purple-100/50 shadow-3xs">{shareUrl}</p>
          <button
            type="button"
            onClick={copyShareUrl}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition hover:scale-[1.02] shadow-3xs cursor-pointer"
          >
            <Copy size={13} /> <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>
      </section>

      {/* External Portfolios */}
      <section className={PANEL_CLASS}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
          <span className="rounded-xl bg-brand/5 p-2 text-brand">
            <ExternalLink size={20} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">External Portfolios</h2>
        </div>
        <div className="grid gap-4">
          {linkFieldConfig.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={LABEL_CLASS}>{label}</label>
              <input
                value={profile.links[key]}
                onChange={(e) => updateProfile(`links.${key}`, ensureHttps(e.target.value))}
                disabled={!editMode}
                placeholder={placeholder}
                className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-150`}
              />
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
