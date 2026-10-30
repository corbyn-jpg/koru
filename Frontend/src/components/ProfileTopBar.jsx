import React from "react";
import { Download, Edit3, Eye, EyeOff, Sparkles } from "lucide-react";

export default function ProfileTopBar({
  editMode,
  setEditMode,
  viewAsPublic,
  setViewAsPublic,
  publicRoute,
  handlePdfExport,
  isExporting,
  saveError,
}) {
  return (
    <div className="flex flex-col gap-4 py-4 mb-4 select-none animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand shadow-3xs">
            <Sparkles size={11} className="text-brand" /> 
            <span>Verified University Profile</span>
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">Professional Profile Builder</h1>
          <p className="mt-3 max-w-3xl text-base text-gray-500 font-medium leading-relaxed">
            Build a portfolio-rich profile with university-verified context, export an ATS-ready
            mini-CV, and control what is publicly visible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            disabled={publicRoute}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-3xs transition hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              editMode
                ? "border-brand bg-brand text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Edit3 size={14} /> 
            <span>{editMode ? "Finish Editing" : "Edit Profile"}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewAsPublic((v) => !v)}
            disabled={publicRoute}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-2 text-xs font-black uppercase tracking-wider text-gray-700 shadow-3xs transition hover:scale-[1.02] hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {viewAsPublic ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{viewAsPublic ? "Exit Preview" : "Preview Public"}</span>
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={isExporting}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-brand hover:bg-brand-deep px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-brand/20 transition hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            <Download size={14} /> 
            <span>{isExporting ? "Exporting..." : "Export to PDF"}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 shadow-3xs animate-fadeIn">
          {saveError}
        </div>
      )}
    </div>
  );
}
