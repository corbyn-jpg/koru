import React from "react";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { isValidUrl } from "../pages/profile/profileUtils";

const PANEL_CLASS =
  "rounded-[30px] border border-gray-200/50 bg-white p-6 shadow-2xs hover:shadow-xs transition duration-300";

// linkEntries: [[label, url], ...]  — all 4 links are shown,
// invalid/empty ones are styled grey and clicks are prevented.
export default function ProfileLinks({ linkEntries }) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-3">
        <span className="rounded-xl bg-brand/5 p-2 text-brand">
          <LinkIcon size={20} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Connected Platforms</h2>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {linkEntries.map(([label, url]) => (
          <a
            key={label}
            href={isValidUrl(url) ? url : undefined}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-wider transition duration-200 ${
              isValidUrl(url)
                ? "border-purple-100 bg-purple-50/45 text-brand hover:bg-purple-50 hover:scale-[1.02] shadow-3xs"
                : "border-gray-200 bg-gray-50/20 text-gray-400 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!isValidUrl(url)) e.preventDefault();
            }}
          >
            <span>{label}</span>
            <ExternalLink size={12} />
          </a>
        ))}
      </div>
    </section>
  );
}
