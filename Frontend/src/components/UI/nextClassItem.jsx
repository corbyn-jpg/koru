import { MdEventNote } from "react-icons/md";

export default function NextClassItem({ subject = "UX300", time = "09:00 - 13:00", room = "Room 101", date = "" }) {
  const subtitle = [date, time, room].filter(Boolean).join(" · ");
  return (
    <div className="my-2 bg-white rounded-xl border border-gray-200 w-full h-12 flex flex-row items-center space-x-2 transition-colors duration-150 hover:bg-gray-50/60 hover:border-gray-200">
      <div className="w-9 h-9 bg-orange-50 rounded-full ml-2 flex items-center justify-center shrink-0">
        <MdEventNote className="w-5 h-5 text-orange-400" />
      </div>
      <div className="ml-2 flex flex-col justify-center space-y-0.5 flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 truncate">{subject}</h3>
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
      </div>
    </div>
  );
}
