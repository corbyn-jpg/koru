import { MdPersonOutline } from "react-icons/md";

const BRAND = "#3C0078";
const BRAND_TINT = "#3C007812";

export default function AnnouncementsItem({
  title = "Prescribed Reading",
  message = "Hi everyone, a quick reminder...",
  time = "11:23AM",
  isRead = true,
  color = BRAND,
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className="my-2 bg-white rounded-xl border border-gray-200 w-full flex flex-row items-center px-3 py-3 transition-colors duration-150 hover:bg-gray-50/60 hover:border-gray-200 cursor-pointer relative overflow-hidden"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: BRAND_TINT, color: BRAND }}
      >
        <MdPersonOutline className="w-5 h-5" />
      </div>

      <div className="flex flex-col justify-center flex-1 ml-3 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm leading-tight truncate ${!isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
            {title}
          </h3>
          {!isRead && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: BRAND }} />
          )}
        </div>
        <p className="text-[11px] text-gray-400 pt-0.5 line-clamp-1 leading-normal">{message}</p>
      </div>

      <div className="ml-3 flex items-start shrink-0">
        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{time}</span>
      </div>
    </div>
  );
}
