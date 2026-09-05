import { useState, useEffect } from "react";
import { Sliders, Info } from "lucide-react";

/**
 * SafetyPreferencePanel.jsx
 * Interconnected safety preference controls with presets and visualization
 */

const SafetyPreferencePanel = ({ onWeightsChange, presets, initialWeights }) => {
  const [weights, setWeights] = useState(initialWeights || {
    safety: 30,
    time: 20,
    facilities: 20,
    efficiency: 30,
  });

  const [selectedPreset, setSelectedPreset] = useState(null);

  useEffect(() => {
    onWeightsChange?.(weights);
  }, [weights, onWeightsChange]);

  const handleSliderChange = (key, value) => {
    const otherKeys = Object.keys(weights).filter((k) => k !== key);
    const remaining = 100 - value;
    const otherTotal = otherKeys.reduce((sum, k) => sum + weights[k], 0);

    const newWeights = { ...weights, [key]: value };

    if (otherTotal > 0) {
      // Distribute the remaining percentage proportionally, giving the last
      // key whatever's left over so rounding always lands on exactly 100
      // (instead of dumping a large remainder into one key, which could
      // push it negative).
      let allocated = 0;
      otherKeys.forEach((k, index) => {
        const isLast = index === otherKeys.length - 1;
        const share = isLast
          ? remaining - allocated
          : Math.round((weights[k] / otherTotal) * remaining);
        newWeights[k] = Math.max(0, share);
        allocated += newWeights[k];
      });
    } else {
      // Other sliders were already at 0 - split what's left evenly.
      const share = Math.floor(remaining / otherKeys.length);
      otherKeys.forEach((k) => {
        newWeights[k] = Math.max(0, share);
      });
    }

    setWeights(newWeights);
    setSelectedPreset(null);
  };

  const handlePresetSelect = (presetKey) => {
    const preset = presets[presetKey];
    if (preset) {
      setWeights(preset.weights);
      setSelectedPreset(presetKey);
    }
  };

  const renderWeightBar = (label, key, color) => {
    const value = weights[key];
    return (
      <div key={key} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-700">{label}</label>
          <span className="text-sm font-extrabold text-slate-900">{value}%</span>
        </div>

        <input
          type="range"
          min="5"
          max="100"
          value={value}
          onChange={(e) => handleSliderChange(key, Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
          }}
        />

        <div className="flex h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r transition-all"
            style={{
              width: `${value}%`,
              backgroundImage: `linear-gradient(90deg, ${color}, ${adjustColor(color, 20)})`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-6">
      <div className="flex items-start gap-3">
        <Sliders className="w-5 h-5 text-sky-600 mt-0.5" />
        <div>
          <h3 className="font-black text-slate-900">Safety Preferences</h3>
          <p className="text-xs text-slate-500 mt-1">
            Adjust how SafeRoute weights different safety factors. Sliders are interconnected — increasing one will decrease others proportionally.
          </p>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase text-slate-500">Quick presets</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              className={`p-3 rounded-xl text-xs font-bold text-center transition-all border ${
                selectedPreset === key
                  ? "bg-sky-600 text-white border-sky-700 shadow-md"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-4">
        {renderWeightBar("🛡️ Safety", "safety", "#3b82f6")}
        {renderWeightBar("⏱️ Time/Efficiency", "time", "#f59e0b")}
        {renderWeightBar("🏥 Facilities", "facilities", "#10b981")}
        {renderWeightBar("⚡ Route Efficiency", "efficiency", "#8b5cf6")}
      </div>

      {/* Weight visualization bar */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase text-slate-500">Total allocation</div>
        <div className="flex h-6 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-blue-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${weights.safety}%` }}
            title="Safety"
          >
            {weights.safety > 15 && "Safety"}
          </div>
          <div
            className="bg-amber-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${weights.time}%` }}
            title="Time"
          >
            {weights.time > 15 && "Time"}
          </div>
          <div
            className="bg-green-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${weights.facilities}%` }}
            title="Facilities"
          >
            {weights.facilities > 15 && "Fac"}
          </div>
          <div
            className="bg-purple-500 transition-all flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${weights.efficiency}%` }}
            title="Efficiency"
          >
            {weights.efficiency > 15 && "Eff"}
          </div>
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 flex gap-2 text-[11px] text-sky-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          These weights influence how SafeRoute calculates route safety scores. The system will recommend routes that best match your preferences.
        </span>
      </div>
    </div>
  );
};

// Helper to adjust color brightness
function adjustColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export default SafetyPreferencePanel;
