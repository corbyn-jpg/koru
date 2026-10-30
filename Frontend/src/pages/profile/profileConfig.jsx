// Base namespace for all per-user, per-role profile data in localStorage.
export const PROFILE_STORAGE_PREFIX = "learnonline.profile";
// Maps public vanity slugs to the owner profile storage key.
export const PUBLIC_PROFILE_INDEX_KEY = `${PROFILE_STORAGE_PREFIX}.public.index`;
export const PROFILE_LAST_ROLE_KEY = `${PROFILE_STORAGE_PREFIX}.last-role`;

export const MAX_IMAGE_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_FILE_SIZE_BYTES = 8 * 1024 * 1024;

// Shared field metadata keeps the live page and PDF export in sync.
export const LINK_FIELD_CONFIG = [
  { key: "github", label: "GitHub", placeholder: "GitHub URL" },
  { key: "behance", label: "Behance", placeholder: "Behance URL" },
  { key: "linkedin", label: "LinkedIn", placeholder: "LinkedIn URL" },
  { key: "website", label: "Website", placeholder: "Personal Website URL" },
];

export const PRIVACY_SECTION_CONFIG = [
  ["header", "Header"],
  ["portfolio", "Portfolio"],
  ["skills", "Skills"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["links", "External Links"],
];

export const SKILL_GROUP_CONFIG = [
  { key: "technical", label: "Technical", placeholder: "Python, Figma, SQL" },
  { key: "soft", label: "Soft", placeholder: "Communication, Teamwork" },
  { key: "interpersonal", label: "Interpersonal", placeholder: "Leadership, Mentoring" },
];

export const LEGACY_DEMO_TEXT_PATTERNS = [
  /^example$/i,
  /^sample$/i,
  /^placeholder$/i,
  /^dummy$/i,
  /^project title$/i,
  /^project description$/i,
  /lorem ipsum/i,
  /github\.com\/(user|username|your-name)/i,
  /linkedin\.com\/in\/(user|username|your-name)/i,
  /behance\.net\/(user|username|your-name)/i,
  /example\.com/i,
  /2-3 sentence professional summary/i,
  /dean'?s list, python certification/i,
];

// Shared utility classes used across all profile components.
export const PANEL_CLASS =
  "rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)]";

export const INPUT_CLASS =
  "rounded-2xl border border-slate-300 bg-white/90 px-4 py-2.5 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
