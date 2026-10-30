import { motion } from "framer-motion";

const ICON_COLORS = {
  purple:  "text-brand/60",
  orange:  "text-ember/70",
  sky:     "text-sky-400",
  emerald: "text-emerald-500",
  slate:   "text-slate-400",
};

const HINT_COLORS = {
  purple:  "text-brand/70",
  orange:  "text-ember/80",
  sky:     "text-sky-500",
  emerald: "text-emerald-600",
  slate:   "text-slate-500",
};

export default function DashboardStatTile({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  variant = "purple",
  loading = false,
}) {
  const iconColor = ICON_COLORS[variant] ?? ICON_COLORS.purple;
  const hintColor = HINT_COLORS[variant] ?? HINT_COLORS.purple;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="bg-white border border-gray-200 shadow-card rounded-2xl px-5 py-4 hover:border-gray-200 transition-colors duration-150"
    >
      {/* Icon + hint row */}
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <Icon
            size={16}
            className={`${iconColor} shrink-0`}
            aria-hidden="true"
          />
        )}
        {hint && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${hintColor}`}>
            {hint}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        {loading ? (
          <span className="inline-block h-6 w-10 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          <>
            <span className="text-2xl font-bold font-['Gabarito'] tabular-nums text-slate-800 leading-none">
              {value}
            </span>
            {suffix && (
              <span className="text-xs font-medium text-slate-400">{suffix}</span>
            )}
          </>
        )}
      </div>

      {/* Label */}
      <p className="mt-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </motion.div>
  );
}
