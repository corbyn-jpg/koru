import React, { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";

// Shared constants – used to load the Google Identity Services button safely
const GOOGLE_SCRIPT_ID = "google-identity-services";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";

// Helper – loads the Google sign-in script once and reuses it across pages
function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.body.appendChild(script);
  });
}

// Reusable Google auth button – used by both the login and sign-up pages
export default function GoogleAuthButton({
  text = "signin_with",
  onCredential,
  onError,
}) {
  const buttonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");

  // Fetch the Google client ID from local env or the backend config endpoint
  useEffect(() => {
    let isMounted = true;

    async function loadClientId() {
      if (clientId) return;

      try {
        const res = await fetch(`${API_BASE}/User/google-config`);
        const data = await res.json();
        if (isMounted && data?.clientId) {
          setClientId(data.clientId);
        }
      } catch {
        // Ignore config fetch failures and fall back to local env config.
      }
    }

    loadClientId();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Render the official Google button once the client ID and script are available
  useEffect(() => {
    let isMounted = true;

    async function setupGoogleButton() {
      if (!clientId || !buttonRef.current) return;

      try {
        await loadGoogleScript();
        if (!isMounted || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              await onCredential?.(response.credential);
            } catch (error) {
              onError?.(error);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          width: 320,
        });
        setIsReady(true);
      } catch (error) {
        onError?.(error);
      }
    }

    setupGoogleButton();

    return () => {
      isMounted = false;
    };
  }, [clientId, onCredential, onError, text]);

  // Google sign-in is optional: without a client ID the button (and its "or" divider) simply isn't shown
  if (!clientId) return null;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <div className="my-2 flex w-full items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      {!isReady ? (
        <div className="flex w-full h-[50px] items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 animate-pulse">
          <div className="w-5 h-5 rounded bg-gray-200 shrink-0" />
          <div className="h-4 rounded-full bg-gray-200 w-36" />
        </div>
      ) : null}
      <div ref={buttonRef} className={isReady ? "" : "hidden"} />
    </div>
  );
}
