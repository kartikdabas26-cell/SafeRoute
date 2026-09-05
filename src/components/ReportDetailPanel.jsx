import { useMemo } from "react";
import { TrendingUp, Eye, Shield, Clock } from "lucide-react";
import { analyzeReportQuality } from "../utils/reportAnalysis";

/**
 * ReportDetailPanel.jsx
 * Display detailed report information with AI confidence analysis
 */

const ReportDetailPanel = ({ report, allReports = [], onClose }) => {
  const analysis = useMemo(
    () => analyzeReportQuality(report, allReports),
    [report, allReports]
  );

  const getTrustColor = (trustLevel) => {
    const colors = {
      "HIGH CONFIDENCE": "bg-green-50 border-green-200 text-green-700",
      "COMMUNITY CONFIRMED": "bg-blue-50 border-blue-200 text-blue-700",
      UNVERIFIED: "bg-amber-50 border-amber-200 text-amber-700",
      "LOW CONFIDENCE": "bg-red-50 border-red-200 text-red-700",
    };
    return colors[trustLevel] || colors.UNVERIFIED;
  };

  const getCategoryColor = (category) => {
    const colors = {
      Lighting: "bg-orange-50 border-orange-200 text-orange-700",
      "Suspicious Activity": "bg-red-50 border-red-200 text-red-700",
      "Road Hazard": "bg-amber-50 border-amber-200 text-amber-700",
      "Harassment Concern": "bg-rose-50 border-rose-200 text-rose-700",
      "Police Presence": "bg-blue-50 border-blue-200 text-blue-700",
      "Unsafe Environment": "bg-red-50 border-red-200 text-red-700",
      "Positive Safety Observation": "bg-green-50 border-green-200 text-green-700",
    };
    return colors[category] || colors["Unsafe Environment"];
  };

  const renderScoreBar = (label, value, color) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span className="text-slate-900">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getCategoryColor(
                report.category
              )}`}
            >
              {report.category}
            </div>
            <div
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getTrustColor(
                analysis.trustLevel
              )}`}
            >
              {analysis.trustLevel}
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-2">{report.title}</h2>
          <p className="text-sm text-slate-600 mt-1">📍 {report.location}</p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {/* Description if available */}
      {report.description && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-sm text-slate-700">{report.description}</p>
        </div>
      )}

      {report.image && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Evidence</h3>
            <span className="text-[10px] font-black uppercase tracking-wide text-sky-600">Report evidence</span>
          </div>
          <img src={report.image} alt={`${report.title} report evidence`} className="w-full aspect-[16/9] object-cover rounded-2xl border border-slate-200" />
        </div>
      )}

      {/* AI Confidence Analysis */}
      <div className="border-t border-slate-200 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-600" />
          <h3 className="font-bold text-slate-900">AI-Assisted Analysis</h3>
        </div>
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800">
          Analysis uses report content, location, recency, duplication, and community activity to assess credibility.
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded-2xl text-center">
            <div className="text-2xl font-black text-blue-600">
              {analysis.confidence}%
            </div>
            <div className="text-[10px] font-bold text-blue-700 mt-1">
              Final Confidence
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-2xl text-center">
            <div className="text-2xl font-black text-green-600">
              {analysis.credibility}%
            </div>
            <div className="text-[10px] font-bold text-green-700 mt-1">
              Credibility
            </div>
          </div>

          <div className="p-3 bg-red-50 rounded-2xl text-center">
            <div className="text-2xl font-black text-red-600">
              {analysis.spamProbability}%
            </div>
            <div className="text-[10px] font-bold text-red-700 mt-1">
              Spam Probability
            </div>
          </div>
        </div>

        {/* Detailed component scores */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
          {renderScoreBar("Originality", analysis.originality, "#8b5cf6")}
          {renderScoreBar("Community Agreement", analysis.communityAgreement, "#10b981")}
          {renderScoreBar("Recency", analysis.recency, "#f59e0b")}
          {renderScoreBar("Verification Status", analysis.verification, "#0284c7")}
        </div>
      </div>

      {/* Community signals */}
      <div className="border-t border-slate-200 pt-4 space-y-3">
        <h3 className="font-bold text-slate-900">Community Signals</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-600" />
              <span className="text-xs text-slate-600">Upvotes</span>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {report.upvotes || 0}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-slate-600">Age</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {formatTime(report.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Impact on routes */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <h3 className="font-bold text-slate-900">Impact on Route Scoring</h3>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
          <p>
            Reports with higher confidence scores have greater influence on route safety
            recommendations. This report's{" "}
            <span className="font-bold">{analysis.confidence}%</span> confidence will{" "}
            {analysis.confidence >= 70
              ? "significantly influence"
              : analysis.confidence >= 50
              ? "moderately influence"
              : "minimally influence"}{" "}
            nearby route scoring.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex gap-3">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <b>Note:</b> AI confidence analysis does not verify that an event actually
          occurred. It assesses report credibility based on available signals. Always
          exercise personal judgment when navigating.
        </span>
      </div>

      {/* Metadata */}
      <div className="border-t border-slate-200 pt-3 space-y-1 text-[11px] text-slate-500">
        <div>
          <b>Report ID:</b> {report.id}
        </div>
        {report.user_id && (
          <div>
            <b>Source:</b> {report.source || "Community"}
          </div>
        )}
        <div>
          <b>Verification:</b> {report.verified ? "Officially Verified" : "Community Unverified"}
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPanel;
