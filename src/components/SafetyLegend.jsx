import {
  Accessibility,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Hospital,
  LifeBuoy,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";

/**
 * SafetyLegend.jsx
 * Display map legend for safety zones and facilities
 */

const SafetyLegend = ({ isExpanded = false, onToggle }) => {
  return (
    <div className="w-44 sm:w-56 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all"
      >
        <h3 className="font-bold text-sm text-slate-900">Legend</h3>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-600" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-3 space-y-3 max-h-72 overflow-y-auto">
          {/* Safety Zones */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Safety Indicator
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-xs text-slate-700">
                  Lower concern (80-100)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-700">
                  Moderate concern (60-79)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-xs text-slate-700">
                  Caution (40-59)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-xs text-slate-700">
                  Higher caution (0-39)
                </span>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Facilities
            </h4>
            <div className="space-y-1.5">
              <FacilityLegendItem Icon={ShieldCheck} label="Police" color="#0284c7" />
              <FacilityLegendItem Icon={Hospital} label="Hospital" color="#dc2626" />
              <FacilityLegendItem Icon={Stethoscope} label="Clinic" color="#e11d48" />
              <FacilityLegendItem Icon={Pill} label="Pharmacy" color="#059669" />
              <FacilityLegendItem Icon={LifeBuoy} label="Help Point" color="#f59e0b" />
              <FacilityLegendItem Icon={UsersRound} label="Support Center" color="#8b5cf6" />
              <FacilityLegendItem Icon={Accessibility} label="Washroom" color="#14b8a6" />
            </div>
          </div>

          {/* Reports */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Community Reports
            </h4>
            <div className="space-y-1.5">
              <ReportLegendItem Icon={MessageCircle} label="Community" color="#f97316" />
              <ReportLegendItem Icon={BadgeCheck} label="Verified" color="#16a34a" />
              <ReportLegendItem Icon={Sparkles} label="AI-Analyzed" color="#2563eb" />
            </div>
          </div>

          {/* Routes */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Routes
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-green-500 rounded-full" />
                <span className="text-xs text-slate-700">Selected (Recommended)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-slate-400 rounded-full" />
                <span className="text-xs text-slate-700">Alternative</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-600">
            <p>
              <b>Disclaimer:</b> Safety indicators are based on community reports and
              infrastructure data. They should not replace personal judgment or
              official emergency services.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const FacilityLegendItem = ({ Icon, label, color }) => (
  <div className="flex items-center gap-2">
    <span className="w-5 h-5 rounded-md grid place-items-center" style={{ color, backgroundColor: `${color}18` }}><Icon className="w-3.5 h-3.5" /></span>
    <span className="text-xs text-slate-700">{label}</span>
  </div>
);

const ReportLegendItem = ({ Icon, label, color }) => (
  <div className="flex items-center gap-2">
    <span className="w-5 h-5 rounded-full grid place-items-center" style={{ color, backgroundColor: `${color}18` }}><Icon className="w-3.5 h-3.5" /></span>
    <span className="text-xs text-slate-700">{label}</span>
  </div>
);

export default SafetyLegend;
