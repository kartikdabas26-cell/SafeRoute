import { Filter } from "lucide-react";

/**
 * MapFilterPanel.jsx
 * Floating map filter controls for toggling facility and report visibility
 */

const MapFilterPanel = ({
  filters,
  onToggle,
  onShowAll,
  onClearAll,
  position = "top-right",
}) => {
  const positionClasses = {
    "top-right": "fixed top-4 right-4",
    "top-left": "fixed top-4 left-4",
    "bottom-right": "fixed bottom-4 right-4",
    "bottom-left": "fixed bottom-4 left-4",
    "inline": "relative",
  };

  const filterGroups = {
    "Reports": ["reports"],
    "Emergency Services": ["police", "hospitals", "pharmacies"],
    "Support Services": ["washrooms", "help_points", "support_centers"],
    "All Facilities": ["facilities"],
  };

  const getFilterIcon = (filterKey) => {
    const icons = {
      reports: "⚠️",
      police: "🛡️",
      hospitals: "🏥",
      pharmacies: "💊",
      washrooms: "🚻",
      help_points: "🆘",
      support_centers: "👥",
      facilities: "📍",
    };
    return icons[filterKey] || "📍";
  };

  const isFloating = position !== "inline";

  return (
    <div
      className={`${positionClasses[position]} ${isFloating ? "z-30 max-w-xs" : "w-full"} bg-white border border-slate-200 rounded-2xl shadow-lg p-4`}
    >
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200">
        <Filter className="w-5 h-5 text-slate-600" />
        <h3 className="font-bold text-base text-slate-900">Map Layers</h3>
      </div>

      <div className={`${isFloating ? "space-y-3 max-h-96 overflow-y-auto" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}`}>
        {Object.entries(filterGroups).map(([groupName, filterKeys]) => (
          <div key={groupName}>
            <div className="text-xs font-bold uppercase text-slate-500 mb-2.5">
              {groupName}
            </div>
            <div className="space-y-2 ml-2">
              {filterKeys.map((filterKey) => (
                <label
                  key={filterKey}
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-all"
                >
                  <input
                    type="checkbox"
                    checked={filters[filterKey] !== false}
                    onChange={() => onToggle(filterKey)}
                    className="w-5 h-5 rounded border-slate-300 text-sky-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="text-base">{getFilterIcon(filterKey)}</span>
                    <span>{formatFilterLabel(filterKey)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`${isFloating ? "border-t border-slate-200 mt-3 pt-3" : "border-t border-slate-200 mt-4 pt-4"} flex gap-2`}>
        <button
          onClick={onShowAll}
          className="flex-1 px-4 py-2.5 text-sm font-bold bg-sky-50 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-100 transition-all"
        >
          Show All
        </button>
        <button
          onClick={onClearAll}
          className="flex-1 px-4 py-2.5 text-sm font-bold bg-slate-100 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
        >
          Clear All
        </button>
      </div>

      {isFloating && (
        <div className="mt-3 text-[11px] text-slate-500 text-center">
          💡 Toggle layers to focus on specific safety information
        </div>
      )}
    </div>
  );
};

function formatFilterLabel(key) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default MapFilterPanel;
