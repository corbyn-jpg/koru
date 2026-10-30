import React from "react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

// Reusable auth input – keeps login and sign-up fields visually consistent
export default function AuthInput({ label, error, className = "", labelClassName = "text-slate-700", onFocus, ...props }) {
  const { speak, enabled } = useTextToSpeech();

  function handleFocus(event) {
    if (enabled) {
      const message = [
        label,
        props.placeholder ? `Hint: ${props.placeholder}` : "",
        error ? `Error: ${error}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      speak(message);
    }

    onFocus?.(event);
  }

  return (
    <label className={`flex w-full flex-col gap-2 text-sm font-medium ${labelClassName}`}>
      <span>{label}</span>
      <input
        {...props}
        aria-label={label}
        aria-invalid={Boolean(error)}
        onFocus={handleFocus}
        className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:-translate-y-0.5 focus:border-brand focus:ring-2 focus:ring-mint ${error ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"} ${className}`}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
