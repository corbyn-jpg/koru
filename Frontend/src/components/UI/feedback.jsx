import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

// App-wide toasts and confirm dialogs, replacing the browser's alert() and confirm().
// Call notify() / confirmAction() from anywhere; <FeedbackHost /> (mounted once in App) renders them.

let toastListener = null;
let confirmListener = null;
let nextId = 0;

// eslint-disable-next-line react-refresh/only-export-components -- tiny helper paired with its host
export function notify(message, tone = "error") {
  toastListener?.({ id: ++nextId, message, tone });
}

// eslint-disable-next-line react-refresh/only-export-components
export function confirmAction(message, { confirmLabel = "Delete", cancelLabel = "Cancel" } = {}) {
  // shortcut: falls back to window.confirm if the host isn't mounted (e.g. in unit tests)
  if (!confirmListener) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => confirmListener({ message, confirmLabel, cancelLabel, resolve }));
}

const EASE_OUT = [0.23, 1, 0.32, 1];

export function FeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [pending, setPending] = useState(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    toastListener = (toast) => {
      setToasts((list) => [...list.slice(-2), toast]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== toast.id)), 5000);
    };
    confirmListener = setPending;
    return () => {
      toastListener = null;
      confirmListener = null;
    };
  }, []);

  function settle(answer) {
    pending?.resolve(answer);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      pending.resolve(false);
      setPending(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[1000] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              role={t.tone === "error" ? "alert" : "status"}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-[0_8px_24px_-8px_rgba(42,0,84,0.25)]"
            >
              {t.tone === "error" ? (
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
              ) : (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" aria-hidden />
              )}
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
                className="rounded-md p-0.5 text-gray-400 transition hover:text-gray-700"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pending && (
          <motion.div
            className="fixed inset-0 z-[1001] flex items-center justify-center bg-gray-900/30 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && settle(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-message"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <p id="confirm-message" className="text-sm leading-relaxed text-gray-800">{pending.message}</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => settle(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  {pending.cancelLabel}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => settle(true)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.97]"
                >
                  {pending.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
