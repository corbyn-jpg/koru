// Timeline node – the vertical track element between event cards
// Renders a connecting line above, a dot in the middle, and a connecting line below
// Visual state changes based on whether the event is active (next up), past, first, or last
export default function TimelineNode({ isActive = false, isPast = false, isFirst = false, isLast = false }) {
  // Past events get a lighter connecting line
  const lineColor = isPast ? "bg-gray-200" : "bg-purple-200";

  return (
    <div className="flex flex-col items-center w-6 shrink-0">
      {/* Top connecting line – hidden for the first event */}
      {!isFirst ? (
        <div className={`w-[2px] flex-1 min-h-[20px] ${lineColor}`} />
      ) : (
        <div className="flex-1 min-h-[20px]" />
      )}

      {/* Centre dot – active = large purple, past = grey filled, future = outlined */}
      <div
        className={`rounded-full shrink-0 transition duration-300 ${
          isActive
            ? "w-4 h-4 bg-purple-500 shadow-[0_0_0_4px_rgba(60,0,120,0.12)]"
            : isPast
            ? "w-3 h-3 bg-gray-300"
            : "w-3 h-3 border-2 border-purple-300 bg-white"
        }`}
      />

      {/* Bottom connecting line – hidden for the last event */}
      {!isLast ? (
        <div className={`w-[2px] flex-1 min-h-[20px] ${lineColor}`} />
      ) : (
        <div className="flex-1 min-h-[20px]" />
      )}
    </div>
  );
}

