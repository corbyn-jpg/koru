import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, Square } from "lucide-react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function getRouteIntro(pathname) {
  if (pathname === "/") return "Welcome to Learn Online.";
  if (pathname.startsWith("/dashboard")) return "Dashboard.";
  if (pathname.startsWith("/calendar")) return "Calendar page.";
  if (pathname.startsWith("/courses")) return "Courses page.";
  if (pathname.startsWith("/settings")) return "Settings page.";
  if (pathname.startsWith("/signup")) return "Create account page.";
  if (pathname.includes("/login") || pathname === "/login") return "Login page.";
  return "Learn Online.";
}

function getFormFieldText(root) {
  return Array.from(root.querySelectorAll("input, select, textarea"))
    .map((element) => {
      const label = element.getAttribute("aria-label") || element.name || element.placeholder || "";
      const value = element.value ? `Current value: ${element.value}` : "";
      return cleanText([label, value].filter(Boolean).join(". "));
    })
    .filter(Boolean)
    .join(". ");
}

function getSpeakablePageText(pathname) {
  if (typeof document === "undefined") {
    return getRouteIntro(pathname);
  }

  const root = document.querySelector('[data-tts-root="true"]') || document.querySelector("main") || document.body;
  const clone = root.cloneNode(true);

  clone.querySelectorAll(".navbar, [aria-hidden='true'], .sr-only, script, style").forEach((element) => {
    element.remove();
  });

  const visibleText = cleanText(clone.innerText || clone.textContent || "");
  const fieldText = getFormFieldText(root);

  return cleanText([getRouteIntro(pathname), visibleText, fieldText].filter(Boolean).join(". "));
}

export default function RouteSpeechAnnouncer() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const { speak, stop, startReading, enabled, readingActive } = useTextToSpeech();

  const readCurrentPage = useCallback(() => {
    const message = getSpeakablePageText(location.pathname);
    if (message) {
      startReading(message);
    }
  }, [location.pathname, startReading]);

  useEffect(() => {
    if (!enabled || !readingActive) {
      previousPathRef.current = location.pathname;
      return undefined;
    }

    if (previousPathRef.current === location.pathname) {
      return undefined;
    }

    previousPathRef.current = location.pathname;
    stop(false);

    const timer = window.setTimeout(() => {
      const message = getSpeakablePageText(location.pathname);
      if (message) {
        speak(message, { force: true });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [enabled, location.pathname, readingActive, speak, stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
    }
  }, [enabled, stop]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex gap-2">
      <button
        type="button"
        onClick={readCurrentPage}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-4 py-2 font-semibold text-white shadow-lg transition hover:bg-[#2f005f]"
        aria-label="Read this page aloud"
      >
        <Volume2 size={18} />
        <span>{readingActive ? "Reading on" : "Read page"}</span>
      </button>
      <button
        type="button"
        onClick={() => stop(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 shadow-lg transition hover:bg-slate-100"
        aria-label="Stop reading"
      >
        <Square size={16} />
        <span>Stop</span>
      </button>
    </div>
  );
}
