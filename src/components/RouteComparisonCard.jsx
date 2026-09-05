import { useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";

/**
 * RouteComparisonCard.jsx
 * Display detailed route comparison with safety breakdown
 */

const RouteComparisonCard = ({ route, isRecommended, isSelected, onSelect, onViewDetails }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskColor = (tone) => {
    const colors = {
      good: "bg-emerald-50 border-emerald-200 text-emerald-700",
      warn: "bg-amber-50 border-amber-200 text-amber-700",
      danger: "bg-rose-50 border-rose-200 text-rose-700",
    };
    return colors[tone] || colors.good;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 65) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div
      className={`rounded-3xl border p-5 transition-all cursor-pointer ${
        isSelected
          ? "border-sky-400 ring-2 ring-sky-200 bg-sky-50/50 shadow-xl"
          : "border-slate-200 bg-white shadow-md hover:shadow-lg"
      }`}
      onClick={() => onSelect(route.id)}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isRecommended && (
              <div className="bg-sky-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                <Star className="w-3 h-3" />
                RECOMMENDED
              </div>
            )}
            <h3 className="font-bold text-slate-900">{route.name}</h3>
          </div>
          {!isSelected && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(route.id);
              }}
              className="mt-2 py-2 px-3 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-all"
            >
              Select this route
            </button>
          )}
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="radio"
              name="selected-route"
              value={route.id}
              checked={isSelected}
              onChange={() => onSelect(route.id)}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 accent-sky-600"
            />
            {isSelected ? "Selected route" : "Choose this route"}
          </label>
          <p className="text-xs text-slate-500">
            {route.distance} • {route.duration}
          </p>
        </div>

        <div className="text-right">
          <div
            className="text-3xl font-black"
            style={{ color: getScoreColor(route.score) }}
          >
            {route.score}
            <span className="text-sm text-slate-400">/100</span>
          </div>
          <div
            className={`text-[10px] font-bold mt-1 px-2.5 py-1 rounded-full border ${getRiskColor(
              route.riskTone
            )}`}
          >
            {route.riskLabel}
          </div>
        </div>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-2xl text-xs">
        <div>
          <div className="text-slate-500 font-semibold">Reports</div>
          <div className="font-bold text-slate-900">{route.components?.community || 0}</div>
        </div>
        <div>
          <div className="text-slate-500 font-semibold">Facilities</div>
          <div className="font-bold text-slate-900">{route.components?.emergency || 0}</div>
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
        className="w-full flex items-center justify-between text-sm font-bold text-sky-600 hover:text-sky-700 py-2"
      >
        <span>View safety breakdown</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
        />
      </button>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          {route.components && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Environmental Safety</span>
                  <span className="text-slate-900">{route.components.environmental}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${route.components.environmental}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Community Reliability</span>
                  <span className="text-slate-900">{route.components.community}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${route.components.community}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Emergency Accessibility</span>
                  <span className="text-slate-900">{route.components.emergency}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${route.components.emergency}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Time Context</span>
                  <span className="text-slate-900">{route.components.time}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${route.components.time}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {route.explanation && route.explanation.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Why this score</div>
              {route.explanation.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-slate-600">
                  <Check className="w-3.5 h-3.5 text-teal-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.(route);
            }}
            className="w-full mt-3 py-2 px-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-100 transition-all"
          >
            Full Analysis
          </button>
        </div>
      )}

      {isSelected && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-sky-100 rounded-2xl">
          <Check className="w-4 h-4 text-sky-700" />
          <span className="text-xs font-bold text-sky-700">This route is selected</span>
        </div>
      )}
    </div>
  );
};

export default RouteComparisonCard;
