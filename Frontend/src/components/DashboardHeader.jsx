import { useMemo } from "react";
import { motion } from "framer-motion";
import DashboardStatTile from "./UI/dashboardStatTile";
import { useAuth } from "../contexts/AuthContext";

function getGreeting(hour) {
  if (hour < 5)  return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

export default function DashboardHeader({
  stats = [],
  loading = false,
  actions,
  contextLine,
}) {
  const { user } = useAuth();

  const now      = new Date();
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);

  const firstName = user?.firstName || user?.name?.split(" ")?.[0] || "";

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-[1400px] mx-auto pt-4"
    >
      <div className="flex flex-col gap-4">
        {/* Greeting row */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold font-['Gabarito'] text-slate-900 leading-tight">
              {greeting}{firstName ? `, ${firstName}` : ""}
              <span className="text-brand">.</span>
            </h1>

            {contextLine && (
              <p className="mt-1 text-sm text-slate-400">{contextLine}</p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {/* Stat tiles */}
        {stats.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
            }}
            className={`grid gap-3 ${
              stats.length === 4
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label + i}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
                }}
              >
                <DashboardStatTile {...s} loading={loading || s.loading} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
