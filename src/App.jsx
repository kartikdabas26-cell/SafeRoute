import { createElement, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Compass,
  Layers3,
  MapPin,
  Menu,
  Navigation,
  Phone,
  PlusCircle,
  Route as RouteIcon,
  Shield,
  Trash2,
  Users,
  X,
  TrendingUp,
  Eye,
  EyeOff,
  ImagePlus,
  ShieldCheck,
  Hospital,
  Stethoscope,
  Pill,
  LifeBuoy,
  UsersRound,
  Accessibility,
  BadgeCheck,
  MessageCircle,
  Mic,
  Volume2,
} from "lucide-react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import "leaflet/dist/leaflet.css";

// Import new utilities
import { scoreRoute } from "./utils/routeScoring";
import { analyzeReportQuality, autoCategorizeReport } from "./utils/reportAnalysis";
import { getFacilityStyle } from "./utils/facilityScoring";
import {
  SAFETY_PRESETS,
} from "./utils/demoData";

// Import components
import SafetyPreferencePanel from "./components/SafetyPreferencePanel";
import RouteComparisonCard from "./components/RouteComparisonCard";
import ReportDetailPanel from "./components/ReportDetailPanel";
import MapFilterPanel from "./components/MapFilterPanel";
import SafetyLegend from "./components/SafetyLegend";

import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  resetPasswordWithEmail,
  logoutUser,
  listenToAuth,
  saveUserProfile,
  logEmergencyEvent,
  saveTrustedContact,
  fetchTrustedContacts,
  deleteTrustedContact,
  saveCommunityReport,
  fetchCommunityReports,
  upvoteCommunityReport,
  normalizeRole,
  ROLE_VALUES,
  subscribeSosEvents,
  subscribeCommunityReports,
  subscribeGuardianConnections,
  subscribeActiveJourneysForStudents,
  connectGuardianToStudent,
  upsertActiveJourney,
  updateEmergencyEventStatus,
  updateEmergencyEventLocation,
  updateCommunityReportStatus,
  saveVoiceProfile,
  fetchVoiceProfile,
} from "./firebase";

// Utilities
const DEFAULT_GOVERNMENT_EMAIL = import.meta.env.VITE_DEFAULT_EMERGENCY_EMAIL || "";
const isGuardianRole = (roleValue) => normalizeRole(roleValue) === ROLE_VALUES.GUARDIAN;
const isPoliceRole = (roleValue) => normalizeRole(roleValue) === ROLE_VALUES.POLICE;
const isStudentRole = (roleValue) => normalizeRole(roleValue) === ROLE_VALUES.STUDENT;

const defaultProfile = {
  fullName: "",
  phone: "",
  emergencyEmail: DEFAULT_GOVERNMENT_EMAIL,
  city: "Delhi",
  ageGroup: "18-25",
  gender: "Prefer not to say",
  role: ROLE_VALUES.STUDENT,
  email: "",
};

function normalizeCoords(coords) {
  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
  }

  if (typeof coords === "string") {
    try {
      const parsed = JSON.parse(coords);
      return normalizeCoords(parsed);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeReport(row) {
  return {
    id: row.id ?? `report-${Date.now()}-${Math.random()}`,
    title: row.title ?? "Untitled report",
    category: row.category ?? "Unsafe Environment",
    location: row.location ?? "Unknown location",
    coords: normalizeCoords(row.coords),
    description: row.description ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
    upvotes: Number(row.upvotes ?? 0),
    verified: Boolean(row.verified),
    source: row.source ?? "Community",
    user_id: row.user_id,
    ai_confidence: row.ai_confidence,
    moderation: row.moderation || { status: "approved", score: 0, reason: "Standard review" },
    image: row.image || null,
  };
}

function assessReportModeration(report, allReports = []) {
  const title = (report.title || "").toLowerCase();
  const description = (report.description || "").toLowerCase();
  const spamKeywords = [
    "click",
    "buy",
    "free",
    "win",
    "prize",
    "cash",
    "casino",
    "sex",
    "escort",
    "offer",
  ];

  let score = 0;
  if (title && spamKeywords.some((keyword) => title.includes(keyword))) score += 35;
  if (description && spamKeywords.some((keyword) => description.includes(keyword))) score += 20;
  if ((report.title || "").length < 12) score += 10;
  if (report.user_id) {
    const similarFromSameUser = allReports.filter(
      (item) => item.user_id === report.user_id && item.id !== report.id
    );
    if (similarFromSameUser.length >= 2) score += 25;
  }

  const analysis = analyzeReportQuality(report, allReports);
  let status = "pending_review";
  if (score >= 60 || analysis.spamProbability >= 70) status = "spam";
  else if (analysis.confidence >= 60 && analysis.spamProbability < 50) status = "approved";

  return {
    status,
    score: Math.min(100, score),
    reason:
      status === "spam"
        ? "Spam-like pattern detected"
        : status === "pending_review"
        ? "Needs manual review"
        : status === "pending_review"
        ? "Awaiting authenticity review"
        : "Rejected by report analysis",
  };
}

function normalizeContact(row) {
  return {
    id: row.id ?? `contact-${Date.now()}-${Math.random()}`,
    name: row.name ?? "Trusted contact",
    relation: row.relation ?? "Trusted Contact",
    phone: row.phone ?? "",
    status: row.status ?? "Active",
  };
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function buildEmergencyMessage(userLocation, selectedRoute) {
  const mapsLink = `https://www.google.com/maps?q=${userLocation[0]},${userLocation[1]}`;
  return [
    "🚨 SafeRoute Emergency Alert 🚨",
    "",
    `${new Date().toLocaleString()}`,
    `📍 Location: ${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
    `Map: ${mapsLink}`,
    selectedRoute
      ? `Current route: ${selectedRoute.name} (${selectedRoute.duration}, ${selectedRoute.distance})`
      : "No active route",
    "",
    "This is an emergency alert from SafeRoute.",
  ].join("\n");
}

async function geocodePlace(query, fallbackCenter) {
  const cleaned = query.trim().toLowerCase();

  if (!cleaned || ["current", "current location", "my location", "gps"].includes(cleaned)) {
    return {
      coords: fallbackCenter,
      label: "Current location",
      source: "GPS",
    };
  }

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&limit=1&lat=${fallbackCenter[0]}&lon=${fallbackCenter[1]}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Photon API failed");

    const data = await response.json();
    const feature = data?.features?.[0];

    if (!feature?.geometry?.coordinates) {
      throw new Error(`Could not find "${query}"`);
    }

    const [lng, lat] = feature.geometry.coordinates;

    return {
      coords: [lat, lng],
      label: feature.properties?.name || query,
      source: "Photon geocoder",
    };
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`, { cause: error });
  }
}

async function fetchRoutes(startCoords, destCoords, profile) {
  const base = `https://router.project-osrm.org/route/v1/${profile}/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}`;
  const url = `${base}?alternatives=true&overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Routing failed with HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== "Ok" || !Array.isArray(data.routes) || !data.routes.length) {
    throw new Error(data.message || "No route was returned");
  }

  return data.routes.map((route, index) => ({
    id: `route-${index + 1}`,
    name: index === 0 ? "Primary route" : `Alternative route ${index}`,
    distance: `${(route.distance / 1000).toFixed(1)} km`,
    distanceMeters: route.distance,
    duration: `${Math.ceil(route.duration / 60)} mins`,
    durationSeconds: route.duration,
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }));
}

async function fetchNearbyFacilities(location) {
  const [latitude, longitude] = location || [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  const query = `[out:json][timeout:20];(nwr[amenity~"^(police|hospital|clinic|pharmacy|toilets)$"](around:5000,${latitude},${longitude});nwr[emergency="ambulance_station"](around:5000,${latitude},${longitude}););out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) throw new Error(`Facility lookup failed with HTTP ${response.status}`);

  const data = await response.json();
  return (data.elements || []).map((element) => {
    const tags = element.tags || {};
    const rawCategory = tags.amenity === "toilets" ? "Washroom" : tags.amenity === "ambulance_station" ? "Help Point" : tags.amenity;
    const category = rawCategory ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1) : "Support Center";
    const coords = element.lat && element.lon ? [element.lat, element.lon] : element.center ? [element.center.lat, element.center.lon] : null;
    return {
      id: `osm-${element.type}-${element.id}`,
      name: tags.name || `${category} near you`,
      category,
      coords,
      address: [tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", "),
      phone: tags.phone || "",
      operatingHours: tags.opening_hours || "",
      verified: false,
      accessible: tags.wheelchair === "yes",
      source: "OpenStreetMap",
    };
  }).filter((facility) => facility.coords);
}

// Status pill component
function StatusPill({ children, tone = "neutral" }) {
  const classes = {
    good: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warn: "bg-amber-50 border-amber-200 text-amber-700",
    danger: "bg-rose-50 border-rose-200 text-rose-700",
    neutral: "bg-slate-50 border-slate-200 text-slate-600",
    blue: "bg-sky-50 border-sky-200 text-sky-700",
  };

  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${classes[tone] || classes.neutral}`}>
      {children}
    </span>
  );
}

function AuthScreen({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authLoading,
  authError,
  authNotice,
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
}) {
  const isLogin = authMode === "login";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-center">
        <div className="bg-white/80 backdrop-blur-lg border border-sky-100 rounded-[32px] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">SafeRoute</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-sky-600 font-bold">Safety Intelligence</div>
            </div>
          </div>

          <h1 className="text-4xl font-black text-slate-900 leading-tight">
            {isLogin ? "Welcome back" : "Create your safety account"}
          </h1>
          <p className="mt-3 text-slate-600 text-base">
            Keep your trusted contacts, emergency profile, and route safety preferences saved in one secure place.
          </p>

          <div className="mt-8 space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Full name</label>
                  <input
                    value={authForm.fullName}
                    onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
                    <input
                      value={authForm.phone}
                      onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                      placeholder="+91 ..."
                      className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">City</label>
                    <input
                      value={authForm.city}
                      onChange={(e) => setAuthForm({ ...authForm, city: e.target.value })}
                      placeholder="Delhi"
                      className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Age</label>
                    <select
                      value={authForm.ageGroup}
                      onChange={(e) => setAuthForm({ ...authForm, ageGroup: e.target.value })}
                      className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
                    >
                      <option>18-25</option>
                      <option>26-35</option>
                      <option>36-45</option>
                      <option>45+</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Gender</label>
                    <select
                      value={authForm.gender}
                      onChange={(e) => setAuthForm({ ...authForm, gender: e.target.value })}
                      className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</label>
                    <select
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                      className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
                    >
                      <option>{ROLE_VALUES.STUDENT}</option>
                      <option>{ROLE_VALUES.GUARDIAN}</option>
                      <option>{ROLE_VALUES.POLICE}</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
                className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl px-4 py-3">
                {authError}
              </div>
            )}

            {authNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl px-4 py-3">
                {authNotice}
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-sky-700 underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              onClick={onSubmit}
              disabled={authLoading}
              className="w-full mt-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg"
            >
              {authLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
            </button>

            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={authLoading}
              className="w-full border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-bold py-3.5 rounded-2xl"
            >
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => setAuthMode(isLogin ? "signup" : "login")}
              className="w-full text-sm font-semibold text-sky-700 underline underline-offset-4"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </div>

          <div className="hidden lg:block">
          <div className="rounded-[32px] border border-sky-100 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 p-8 text-white shadow-xl">
            <div className="text-xs uppercase tracking-[0.3em] font-bold opacity-80">SafeRoute</div>
            <h2 className="mt-4 text-4xl font-black leading-tight">Safer routes, faster help, trusted alerts.</h2>
            <ul className="mt-8 space-y-4 text-sm text-sky-50">
              <li>• Save your profile and emergency contacts</li>
              <li>• Compare safe routes in real time</li>
              <li>• Submit and read community reports</li>
              <li>• Trigger SOS with location + route details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({
  profile,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(profile || defaultProfile);

  return (
    <div className="profile-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="profile-modal-card bg-white max-w-2xl w-full rounded-[28px] p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-sky-600">Profile</div>
            <h3 className="text-2xl font-black text-slate-900">Account details</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Full name</label>
            <input
              value={draft.fullName || ""}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
            <input
              value={draft.phone || ""}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">City</label>
            <input
              value={draft.city || ""}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Age group</label>
            <select
              value={draft.ageGroup || "18-25"}
              onChange={(e) => setDraft({ ...draft, ageGroup: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            >
              <option>18-25</option>
              <option>26-35</option>
              <option>36-45</option>
              <option>45+</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Gender</label>
            <select
              value={draft.gender || "Prefer not to say"}
              onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            >
              <option>Female</option>
              <option>Male</option>
              <option>Non-binary</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</label>
            <select
              value={normalizeRole(draft.role || ROLE_VALUES.STUDENT)}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            >
              <option>{ROLE_VALUES.STUDENT}</option>
              <option>{ROLE_VALUES.GUARDIAN}</option>
              <option>{ROLE_VALUES.POLICE}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Emergency contact / official email</label>
            <input
              value={draft.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL}
              onChange={(e) => setDraft({ ...draft, emergencyEmail: e.target.value })}
              className="mt-2 w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancel</button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-3 rounded-xl bg-sky-600 text-white font-bold shadow-md"
          >
            Save profile
          </button>
        </div>
      </div>
    </div>
  );
}

// Map view component
function MapView({
  userLocation,
  reports,
  facilities,
  routes,
  selectedRouteId,
  filters,
  layerVisibility = {},
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView(userLocation, 14);

    [
      ["safetyZones", 300],
      ["facilities", 400],
      ["reports", 500],
      ["alternateRoute", 600],
      ["primaryRoute", 700],
      ["locations", 800],
    ].forEach(([name, zIndex]) => map.createPane(name).style.zIndex = zIndex);

    L.control.zoom({ position: "topright" }).addTo(map);

    const locateControl = L.control({ position: "topright" });
    locateControl.onAdd = () => {
      const button = L.DomUtil.create("button", "leaflet-bar leaflet-control-locate");
      button.type = "button";
      button.title = "Locate Me";
      button.setAttribute("aria-label", "Locate Me");
      button.innerHTML = "⌖";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", () => map.setView(userLocation, Math.max(map.getZoom(), 14), { animate: true }));
      return button;
    };
    locateControl.addTo(map);

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
        maxNativeZoom: 19,
        maxZoom: 20,
      }
    ).addTo(map);

    const userMarker = L.marker(userLocation, {
      pane: "locations",
      icon: mapMarkerIcon(MapPin, "#0284c7", "map-marker-location"),
    })
      .addTo(map)
      .bindTooltip("Your current position", { direction: "top", offset: [0, -28] })
      .bindPopup("<b>Your current position</b><br/>Live location");

    userMarker.openPopup();
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  // Leaflet is mounted once; later location changes are handled by the next effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(userLocation, mapRef.current.getZoom(), {
      animate: true,
    });
  }, [userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;

    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    const addLayer = (layer, group) => {
      layer.addTo(mapRef.current);
      layersRef.current.push(layer);
      if (group) layer.options.pane = group;
      return layer;
    };

    const routeData = routes.map((route) => ({
          ...route,
          pane: route.id === selectedRouteId ? "primaryRoute" : "alternateRoute",
          color: route.id === selectedRouteId ? "#10b981" : route.score >= 65 ? "#f59e0b" : "#ef4444",
          weight: route.id === selectedRouteId ? 7 : 4,
          opacity: route.id === selectedRouteId ? 0.9 : 0.6,
          dashArray: route.id === selectedRouteId ? undefined : "8 8",
        }));

    routeData.forEach((route) => {
      if (route.id !== selectedRouteId && layerVisibility.alternateRoute === false) return;
      addLayer(L.polyline(route.coordinates, {
        color: route.color,
        weight: route.weight,
        opacity: route.opacity,
        dashArray: route.dashArray,
        pane: route.pane,
      }).bindPopup(`<b>${route.name}</b><br/>${route.distance} • ${route.duration}<br/>Safety: ${route.score}/100`));
    });
    const reportData = reports.filter((report) => (report.moderation?.status || "approved") === "approved");
    const averageVotes = reportData.length
      ? reportData.reduce((total, report) => total + Number(report.upvotes || 0), 0) / reportData.length
      : 0;
    if (filters.reports !== false && layerVisibility.communityReports !== false) {
      reportData.forEach((report) => {
        if (!report.coords) return;

        const isHotspot = averageVotes > 0 && Number(report.upvotes || 0) >= averageVotes * 4;
        const color = isHotspot ? "#dc2626" : report.verified ? "#0284c7" : "#f59e0b";

        const popupHtml = [
          `<b>${report.title}</b>`,
          `<div>${report.title || report.category}</div>`,
          `<div>Votes: ${Number(report.upvotes || 0)}</div>`,
          `<div>${report.location || "Community report"}</div>`,
          `<div>${isHotspot ? "High-confirmation safety concern" : "Community report"}</div>`,
        ].join("<br/>");

        const ReportIcon = report.status === "Verified" || report.verified
          ? BadgeCheck
          : MessageCircle;
        if (isHotspot) {
          addLayer(L.circle(report.coords, {
            radius: 250,
            color: "#dc2626",
            weight: 2,
            fillColor: "#dc2626",
            fillOpacity: 0.2,
            pane: "safetyZones",
          }).bindPopup(`<b>High-confirmation area</b><br/>${report.title}<br/>Votes: ${report.upvotes}<br/>Average: ${averageVotes.toFixed(1)}`));
        }
        const marker = L.marker(report.coords, {
          pane: "reports",
          icon: mapMarkerIcon(ReportIcon, color, "map-marker-report"),
        })
          .addTo(mapRef.current)
          .bindTooltip(
            `${isHotspot ? "High-confirmation area" : "Community report"}<br/>${report.upvotes} votes`,
            { direction: "top", offset: [0, -28] }
          )
          .bindPopup(popupHtml);

        layersRef.current.push(marker);
      });
    }

    // Facilities (respect per-category filters)
    const categoryKeyFor = (cat) => {
      if (!cat) return null;
      const c = String(cat).toLowerCase();
      if (c.includes("police")) return "police";
      if (c.includes("hospital") || c.includes("clinic")) return "hospitals";
      if (c.includes("pharmacy")) return "pharmacies";
      if (c.includes("washroom") || c.includes("restroom")) return "washrooms";
      if (c.includes("help") || c.includes("help point")) return "help_points";
      if (c.includes("support")) return "support_centers";
      return "facilities";
    };

    const facilityData = facilities;
    if (filters.facilities !== false && layerVisibility.facilities !== false) {
      facilityData.forEach((facility) => {
        const key = categoryKeyFor(facility.category);
        if (key && filters[key] === false) return; // category specifically disabled

        const style = getFacilityStyle(facility.category);
        const popupHtml = [
          `<b>${facility.name}</b>`,
          `<div class="text-sm">${facility.category}</div>`,
          facility.phone ? `<div class="text-xs">Phone: ${facility.phone}</div>` : "",
          facility.operatingHours ? `<div class="text-xs">Hours: ${facility.operatingHours}</div>` : "",
          "",
        ].filter(Boolean).join("<br/>");

        const FacilityIcon = facilityMarkerIcons[facility.category] || MapPin;
        const marker = L.marker(facility.coords, {
          pane: "facilities",
          icon: mapMarkerIcon(FacilityIcon, style.color, "map-marker-facility"),
        })
          .addTo(mapRef.current)
          .bindTooltip(`${facility.category}<br/>${facility.name}`, { direction: "top", offset: [0, -28] })
          .bindPopup(popupHtml);

        layersRef.current.push(marker);
      });
    }
  }, [reports, facilities, routes, selectedRouteId, filters, layerVisibility, userLocation]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function formatDashboardTime(value) {
  if (!value) return "Not available";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function coordsFromLocation(value) {
  const coords = normalizeCoords(value);
  if (!coords) return null;
  return coords;
}

const facilityMarkerIcons = {
  Police: ShieldCheck,
  Hospital,
  Clinic: Stethoscope,
  Pharmacy: Pill,
  "Help Point": LifeBuoy,
  "Support Center": UsersRound,
  Washroom: Accessibility,
};

function mapMarkerIcon(Icon, color, className = "") {
  const iconMarkup = renderToStaticMarkup(createElement(Icon, { size: 16, strokeWidth: 2.4 }));
  return L.divIcon({
    className: "map-marker-host",
    html: `<span class="map-marker ${className}" style="--marker-accent:${color}">${iconMarkup}</span>`,
    iconSize: [34, 40],
    iconAnchor: [17, 36],
    popupAnchor: [0, -34],
  });
}

function DashboardHeader({ title, subtitle, role, profile, onProfile, onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 truncate">{title}</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-sky-700 font-bold truncate">{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold">
            {role}
          </span>
          <button onClick={onProfile} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold">
            {profile?.fullName || profile?.name || "Profile"}
          </button>
          <button onClick={onLogout} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function MetricTile({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900 bg-white border-slate-200",
    sky: "text-sky-700 bg-sky-50 border-sky-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
  };

  return (
    <div className={`border rounded-2xl p-5 ${tones[tone] || tones.slate}`}>
      <div className="text-xs uppercase tracking-[0.18em] font-bold opacity-70">{label}</div>
      <div className="text-3xl font-black mt-2">{value}</div>
    </div>
  );
}

function voiceVectorFromSamples(samples) {
  const vector = [];
  const windowSize = Math.max(1, Math.floor(samples.length / 32));
  for (let index = 0; index < 32; index += 1) {
    const start = index * windowSize;
    const end = Math.min(samples.length, start + windowSize);
    let energy = 0;
    for (let cursor = start; cursor < end; cursor += 1) energy += Math.abs(samples[cursor] || 0);
    vector.push(energy / Math.max(1, end - start));
  }

  let crossings = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if ((samples[index - 1] < 0) !== (samples[index] < 0)) crossings += 1;
  }
  vector.push(crossings / Math.max(1, samples.length));
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

async function fingerprintAudioBlob(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Audio verification is not supported in this browser.");
  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    return voiceVectorFromSamples(buffer.getChannelData(0));
  } finally {
    await context.close();
  }
}

function voiceSimilarity(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) return 0;
  return first.reduce((total, value, index) => total + value * second[index], 0);
}

function recordMicrophone(durationMs, onRecorderReady) {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onerror = () => reject(new Error("Microphone recording failed."));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    };
    onRecorderReady?.(recorder);
    recorder.start();
    window.setTimeout(() => recorder.stop(), durationMs);
  }));
}

function EmergencySiren({ active }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled || !active) return undefined;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const audioContext = new AudioContextClass();
    const beep = () => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(720, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1050, audioContext.currentTime + 0.35);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.46);
    };

    beep();
    const timer = window.setInterval(beep, 900);
    return () => {
      window.clearInterval(timer);
      audioContext.close();
    };
  }, [active, enabled]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((value) => !value)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
        enabled && active
          ? "border-rose-300 bg-rose-100 text-rose-800"
          : "border-slate-200 bg-white text-slate-700"
      }`}
      title="Browsers require one user gesture before emergency audio can play"
    >
      <Volume2 className="w-4 h-4" />
      {enabled ? (active ? "Siren on" : "Siren armed") : "Enable siren"}
    </button>
  );
}

function VoiceSosControl({ userId, onTrigger }) {
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderChunksRef = useRef([]);
  const recorderStreamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchVoiceProfile(userId)
      .then((profile) => {
        if (!cancelled) setVoiceProfile(profile);
      })
      .catch(() => setStatus("Could not load your voice profile."));
    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [userId]);

  const enrollVoice = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !(window.AudioContext || window.webkitAudioContext)) {
      setStatus("Voice enrollment is not supported in this browser.");
      return;
    }

    try {
      setStatus("Speak naturally for three seconds to enroll your voice...");
      const blob = await recordMicrophone(3000);
      const vector = await fingerprintAudioBlob(blob);
      await saveVoiceProfile(userId, { vector, version: 1, enrolledAt: new Date().toISOString() });
      setVoiceProfile({ vector, version: 1 });
      setStatus("Voice profile saved securely with your account.");
    } catch (error) {
      setStatus(error.message || "Voice enrollment failed.");
    }
  };

  const toggleListening = async () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }
    if (!voiceProfile?.vector) {
      setStatus("Enroll your voice before enabling voice SOS.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setListening(false);
      setStatus("Voice SOS paused.");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("Microphone permission is required for voice SOS.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    recorderChunksRef.current = [];
    recorderStreamRef.current = stream;
    recorder.ondataavailable = (event) => recorderChunksRef.current.push(event.data);
    recorderRef.current = recorder;
    recorder.start();

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = async (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .toLowerCase();
      if (/\b(help|sos|emergency)\b/.test(transcript)) {
        recognition.stop();
        const activeRecorder = recorderRef.current;
        setListening(false);
        try {
          setStatus("Verifying your voice...");
          const blob = await new Promise((resolve, reject) => {
            if (!activeRecorder) {
              reject(new Error("Voice sample unavailable."));
              return;
            }
            activeRecorder.onstop = () => {
              recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
              resolve(new Blob(recorderChunksRef.current, { type: activeRecorder.mimeType || "audio/webm" }));
            };
            activeRecorder.stop();
          });
          const similarity = voiceSimilarity(voiceProfile.vector, await fingerprintAudioBlob(blob));
          if (similarity < 0.88) throw new Error("Voice did not match the enrolled profile.");
          onTrigger();
          setStatus("Voice verified. SOS sent.");
        } catch (error) {
          setStatus(error.message || "Voice verification failed.");
        }
      }
    };
    recognition.onerror = () => setStatus("Voice recognition stopped. Check microphone permission.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus("Listening for help, SOS, or emergency...");
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-teal-800 text-xs font-black uppercase tracking-wider">
            <Mic className="w-4 h-4" />
            Voice SOS
          </div>
          <p className="text-xs text-teal-900 mt-1">Enroll once, then say “help”, “SOS”, or “emergency”.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={enrollVoice} className="rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-800">
            {voiceProfile ? "Re-enroll voice" : "Enroll voice"}
          </button>
          <button type="button" onClick={toggleListening} className={`rounded-xl px-3 py-2 text-xs font-bold text-white ${listening ? "bg-rose-600" : "bg-teal-700"}`}>
            {listening ? "Stop listening" : "Enable voice SOS"}
          </button>
        </div>
      </div>
      {status && <div className="mt-2 text-[11px] font-semibold text-teal-800">{status}</div>}
    </section>
  );
}

function GuardianDashboard({ user, profile, onLogout, onProfile }) {
  const [connections, setConnections] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [studentEmail, setStudentEmail] = useState("");
  const [relation, setRelation] = useState("Guardian");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectStatus, setConnectStatus] = useState("");
  const [trackedAlert, setTrackedAlert] = useState(null);
  const [pendingResolutionId, setPendingResolutionId] = useState(null);

  useEffect(() => {
    const unsubscribeConnections = subscribeGuardianConnections(
      { uid: user.uid, email: user.email },
      (items) => {
        setConnections(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not load connected students.");
        setLoading(false);
      }
    );

    const unsubscribeAlerts = subscribeSosEvents(
      { uid: user.uid, role: ROLE_VALUES.GUARDIAN },
      (items) => setAlerts(items.filter((item) => item.status !== "resolved")),
      (err) => setError(err.message || "Could not load SOS alerts.")
    );

    return () => {
      unsubscribeConnections();
      unsubscribeAlerts();
    };
  }, [user.uid, user.email]);

  useEffect(() => {
    const studentIds = connections.map((item) => item.studentUid || item.userId || item.uid).filter(Boolean);
    return subscribeActiveJourneysForStudents(
      studentIds,
      setJourneys,
      (err) => setError(err.message || "Could not load live journeys.")
    );
  }, [connections]);

  const connectedStudentIds = new Set(connections.map((item) => item.studentUid || item.userId || item.uid));
  const relevantAlerts = alerts.filter((alert) => connectedStudentIds.has(alert.uid));
  const journeyMarkers = journeys
    .map((journey) => ({
      id: journey.id,
      title: journey.studentName || "Student journey",
      category: journey.status || "Journey",
      coords: coordsFromLocation(journey.userLocation),
      verified: true,
    }))
    .filter((item) => item.coords);
  const trackedMarker = trackedAlert && coordsFromLocation(trackedAlert.userLocation)
    ? [{
        id: `tracked-${trackedAlert.id}`,
        title: `${trackedAlert.fullName || "Student"} live SOS location`,
        category: "Resolved SOS tracking",
        coords: coordsFromLocation(trackedAlert.userLocation),
        verified: true,
      }]
    : [];
  const mapCenter = trackedMarker[0]?.coords || journeyMarkers[0]?.coords || [28.709, 77.037];

  // simple toast for new SOS relevant to this guardian
  const [toast, setToast] = useState(null);
  const prevRelevantRef = useRef(relevantAlerts.length);

  useEffect(() => {
    if (relevantAlerts.length > prevRelevantRef.current) {
      const newest = relevantAlerts[0];
      setToast({
        title: `SOS: ${newest.fullName || 'Student'}`,
        body: newest.destination || newest.routeName || 'Location shared',
        id: newest.id,
      });
      window.setTimeout(() => setToast(null), 6000);
    }
    prevRelevantRef.current = relevantAlerts.length;
  }, [relevantAlerts]);

  const handleConnectStudent = async (event) => {
    event.preventDefault();
    setConnectStatus("");
    setError("");

    try {
      await connectGuardianToStudent({
        guardianUid: user.uid,
        guardianEmail: user.email,
        studentEmail,
        relation,
      });
      setStudentEmail("");
      setRelation("Guardian");
      setConnectStatus("Student connected. Their shared journeys and SOS alerts will appear here.");
    } catch (err) {
      setError(err.message || "Could not connect student.");
    }
  };

  const handleAlertStatus = async (alert, status) => {
    try {
      await updateEmergencyEventStatus(alert.id, status);
      if (status === "resolved") setTrackedAlert(alert);
    } catch (err) {
      setError(err.message || "Could not update SOS status.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <DashboardHeader
        title="SafeRoute Guardian"
        subtitle="Trusted monitoring dashboard"
        role={ROLE_VALUES.GUARDIAN}
        profile={profile}
        onProfile={onProfile}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-semibold">{error}</div>}
        {loading && <div className="rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 px-4 py-3 text-sm font-semibold">Loading Guardian data from Firestore...</div>}

        <div className="grid md:grid-cols-4 gap-4">
          <MetricTile label="Connected students" value={connections.length} tone="sky" />
          <MetricTile label="Live journeys" value={journeys.length} tone="emerald" />
          <MetricTile label="Active SOS" value={relevantAlerts.length} tone="rose" />
          <MetricTile label="Trusted circle" value={connections.filter((item) => item.status === "Active").length} tone="amber" />
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              Trusted-circle management
            </div>
            <form onSubmit={handleConnectStudent} className="grid sm:grid-cols-[1fr_0.7fr_auto] gap-3">
              <input
                type="email"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                placeholder="student@example.com"
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
                required
              />
              <input
                value={relation}
                onChange={(event) => setRelation(event.target.value)}
                placeholder="Relation"
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <button className="bg-slate-900 text-white rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 justify-center">
                <PlusCircle className="w-4 h-4" />
                Connect
              </button>
            </form>
            {connectStatus && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{connectStatus}</div>}

            <div className="space-y-3">
              {connections.length === 0 ? (
                <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-2xl p-5">No students connected yet.</div>
              ) : (
                connections.map((connection) => {
                  const journey = journeys.find((item) => item.studentUid === (connection.studentUid || connection.userId || connection.uid));
                  return (
                    <div key={connection.id} className="border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900">{connection.studentName || connection.name}</div>
                          <div className="text-sm text-slate-500">{connection.studentEmail || connection.email || connection.contactEmail}</div>
                        </div>
                        <StatusPill tone={journey ? "good" : "neutral"}>{journey ? "Sharing" : "Offline"}</StatusPill>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">
                        Journey status: <span className="font-semibold">{journey?.status || "No active shared journey"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[420px]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-700">Live journey tracking</div>
                <div className="text-sm text-slate-500 mt-1">Locations appear only when a student is sharing.</div>
              </div>
              <MapPin className="w-5 h-5 text-sky-700" />
            </div>
            <div className="h-[360px]">
              <MapView
                userLocation={mapCenter}
                reports={[...journeyMarkers, ...trackedMarker]}
                facilities={[]}
                routes={[]}
                selectedRouteId={null}
                filters={{ reports: true }}
              />
            </div>
          </section>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider mb-4">
            <BellRing className="w-4 h-4" />
            SOS and emergency alerts
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {relevantAlerts.length === 0 ? (
              <div className="text-sm text-slate-500">No active SOS alerts for connected students.</div>
            ) : (
              relevantAlerts.map((alert) => (
                <div key={alert.id} className="border border-rose-200 bg-rose-50 rounded-2xl p-4">
                  <div className="font-black text-rose-900">{alert.fullName || alert.studentName || "Student"}</div>
                  <div className="text-sm text-rose-700 mt-1">{alert.destination || "Destination not specified"}</div>
                  <div className="text-xs text-rose-600 mt-2">{formatDashboardTime(alert.createdAt)}</div>
                  {coordsFromLocation(alert.userLocation) && (
                    <div className="text-xs text-rose-700 mt-2 font-semibold">Live location is available on the map.</div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleAlertStatus(alert, "responding")} className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold">Responding</button>
                    {pendingResolutionId === alert.id ? (
                      <button onClick={() => handleAlertStatus(alert, "resolved")} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Resolved</button>
                    ) : (
                      <button onClick={() => setPendingResolutionId(alert.id)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Resolve</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {trackedAlert && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
              Tracking the last live location for {trackedAlert.fullName || "the student"} after resolution.
            </div>
          )}
        </section>
      </main>
      {toast && (
        <div className="fixed top-6 right-6 z-50 w-80">
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl shadow-lg">
            <div className="font-bold text-rose-800">{toast.title}</div>
            <div className="text-sm text-rose-700">{toast.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PoliceDashboard({ user, profile, onLogout, onProfile }) {
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingResolutionId, setPendingResolutionId] = useState(null);

  useEffect(() => {
    const unsubscribeAlerts = subscribeSosEvents(
      { uid: user.uid, role: ROLE_VALUES.POLICE },
      (items) => {
        setAlerts(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not load SOS alerts.");
        setLoading(false);
      }
    );

    const unsubscribeReports = subscribeCommunityReports(
      (items) => setReports(items.map(normalizeReport)),
      (err) => setError(err.message || "Could not load incident reports.")
    );

    return () => {
      unsubscribeAlerts();
      unsubscribeReports();
    };
  }, [user.uid]);

  const activeAlerts = alerts.filter((alert) => !["resolved", "closed"].includes(String(alert.status || "").toLowerCase()));
  const incidentReports = reports.filter((report) => (report.moderation?.status || report.status || "approved") !== "spam");
  const hotspots = Object.values(
    incidentReports.reduce((acc, report) => {
      const key = report.location || "Unknown location";
      acc[key] = acc[key] || { location: key, count: 0, categories: new Set() };
      acc[key].count += 1;
      acc[key].categories.add(report.category);
      return acc;
    }, {})
  )
    .map((item) => ({ ...item, categories: Array.from(item.categories).join(", ") }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const mapReports = incidentReports.filter((report) => report.coords);
  const mapCenter = mapReports[0]?.coords || coordsFromLocation(activeAlerts[0]?.userLocation) || [28.709, 77.037];

  // simple toast for new active alerts
  const [toast, setToast] = useState(null);
  const prevActiveRef = useRef(activeAlerts.length);

  useEffect(() => {
    if (activeAlerts.length > prevActiveRef.current) {
      const newest = activeAlerts[0];
      setToast({ title: `NEW EMERGENCY: ${newest.fullName || 'User'}`, body: newest.routeName || newest.destination || 'See map' });
      window.setTimeout(() => setToast(null), 7000);
    }
    prevActiveRef.current = activeAlerts.length;
  }, [activeAlerts]);

  const handleAlertStatus = async (alertId, status) => {
    try {
      await updateEmergencyEventStatus(alertId, status);
    } catch (err) {
      setError(err.message || "Could not update SOS status.");
    }
  };

  const handleReportStatus = async (reportId, status) => {
    try {
      await updateCommunityReportStatus(reportId, status);
    } catch (err) {
      setError(err.message || "Could not update report status.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <DashboardHeader
        title="SafeRoute Police"
        subtitle="Emergency and incident command"
        role={ROLE_VALUES.POLICE}
        profile={profile}
        onProfile={onProfile}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-semibold">{error}</div>}
        {loading && <div className="rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 px-4 py-3 text-sm font-semibold">Loading Police data from Firestore...</div>}

        <div className="grid md:grid-cols-4 gap-4">
          <MetricTile label="Active SOS" value={activeAlerts.length} tone="rose" />
          <MetricTile label="Reported incidents" value={incidentReports.length} tone="amber" />
          <MetricTile label="Hotspots" value={hotspots.length} tone="sky" />
          <MetricTile label="Resolved alerts" value={alerts.filter((item) => item.status === "resolved").length} tone="emerald" />
        </div>

        <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[460px]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-700">Incident locations on map</div>
                <div className="text-sm text-slate-500 mt-1">Community reports and active SOS positions from Firestore.</div>
              </div>
              <div className="flex items-center gap-2">
                <EmergencySiren active={activeAlerts.length > 0} />
                <Layers3 className="w-5 h-5 text-sky-700" />
              </div>
            </div>
            <div className="h-[400px]">
              <MapView
                userLocation={mapCenter}
                reports={[
                  ...mapReports,
                  ...activeAlerts.map((alert) => ({
                    id: alert.id,
                    title: alert.fullName || "SOS alert",
                    category: "SOS",
                    coords: coordsFromLocation(alert.userLocation),
                    verified: true,
                  })).filter((item) => item.coords),
                ]}
                facilities={[]}
                routes={[]}
                selectedRouteId={null}
                filters={{ reports: true }}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider mb-4">
              <BellRing className="w-4 h-4" />
              Active SOS queue
            </div>
            <div className="space-y-3 max-h-[410px] overflow-y-auto pr-1">
              {activeAlerts.length === 0 ? (
                <div className="text-sm text-slate-500">No active SOS alerts.</div>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={alert.id} className="border border-rose-200 bg-rose-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-rose-950">{alert.fullName || "Unknown user"}</div>
                        <div className="text-sm text-rose-700">{alert.destination || alert.routeName || "No route details"}</div>
                      </div>
                      <StatusPill tone="danger">{alert.status || "active"}</StatusPill>
                    </div>
                    <div className="text-xs text-rose-700 mt-2">{formatDashboardTime(alert.createdAt)}</div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleAlertStatus(alert.id, "responding")} className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold">Responding</button>
                      {pendingResolutionId === alert.id ? (
                        <button onClick={() => handleAlertStatus(alert.id, "resolved")} className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Resolved</button>
                      ) : (
                        <button onClick={() => setPendingResolutionId(alert.id)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Resolve</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
              <TrendingUp className="w-4 h-4" />
              Safety hotspots
            </div>
            <div className="space-y-3">
              {hotspots.length === 0 ? (
                <div className="text-sm text-slate-500">No hotspots calculated yet.</div>
              ) : (
                hotspots.map((hotspot) => (
                  <div key={hotspot.location} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex justify-between gap-3">
                      <div className="font-bold text-slate-900">{hotspot.location}</div>
                      <StatusPill tone={hotspot.count >= 3 ? "danger" : "warn"}>{hotspot.count} reports</StatusPill>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{hotspot.categories}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider mb-4">
              <AlertTriangle className="w-4 h-4" />
              Recent community reports
            </div>
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {incidentReports.length === 0 ? (
                <div className="text-sm text-slate-500">No community incidents have been reported.</div>
              ) : (
                incidentReports.slice(0, 25).map((report) => (
                  <div key={report.id} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900">{report.title}</div>
                        <div className="text-sm text-slate-500">{report.location} - {report.category}</div>
                      </div>
                      <StatusPill tone={report.verified ? "good" : "neutral"}>{report.status || report.moderation?.status || "new"}</StatusPill>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">{report.description || "No details provided."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => handleReportStatus(report.id, "approved")} className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">Approve</button>
                      <button onClick={() => handleReportStatus(report.id, "investigating")} className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold">Investigating</button>
                      <button onClick={() => handleReportStatus(report.id, "resolved")} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Resolve</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      {toast && (
        <div className="fixed top-6 right-6 z-50 w-96">
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl shadow-lg">
            <div className="font-black text-rose-900">{toast.title}</div>
            <div className="text-sm text-rose-700">{toast.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App component
export default function App() {
  const [activeTab, setActiveTab] = useState("routes");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [reportView, setReportView] = useState("all");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    city: "Delhi",
    ageGroup: "18-25",
    gender: "Prefer not to say",
    role: ROLE_VALUES.STUDENT,
    emergencyEmail: DEFAULT_GOVERNMENT_EMAIL,
  });
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  // Location
  const [userLocation, setUserLocation] = useState([28.709, 77.037]);
  const [locationStatus, setLocationStatus] = useState("Waiting for live location");

  // Routing
  const [startLocation, setStartLocation] = useState("Current Location");
  const [destination, setDestination] = useState("");
  const [travelMode] = useState("walking");
  const [isSearching, setIsSearching] = useState(false);
  const [routesSearched, setRoutesSearched] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Safety preferences
  const [safetyWeights, setSafetyWeights] = useState({
    safety: 30,
    time: 20,
    facilities: 20,
    efficiency: 30,
  });

  // Map filters
  const [mapFilters, setMapFilters] = useState({
    reports: true,
    facilities: true,
    police: true,
    hospitals: true,
    pharmacies: true,
    washrooms: true,
    help_points: true,
    support_centers: true,
  });
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [mapLayerVisibility, setMapLayerVisibility] = useState({
    safetyZones: true,
    facilities: true,
    communityReports: true,
    aiAnalysis: true,
    alternateRoute: true,
  });
  const [layerControlOpen, setLayerControlOpen] = useState(false);

  // Data
  const [reports, setReports] = useState([]);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [facilities, setFacilities] = useState([]);

  // Forms
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");

  const [newReportTitle, setNewReportTitle] = useState("");
  const [newReportCategory, setNewReportCategory] = useState("Lighting");
  const [newReportLocation, setNewReportLocation] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportImage, setNewReportImage] = useState("");

  // SOS
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(15);
  const [lastSosId, setLastSosId] = useState(null);
  const [studentAlerts, setStudentAlerts] = useState([]);
  const [shareStatus, setShareStatus] = useState("");

  // Report detail
  const [selectedReport, setSelectedReport] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const unsubscribe = listenToAuth((nextUser) => {
      setAuthError("");
      setAuthInitializing(false);
      if (nextUser?.profile) {
        setAuthForm((prev) => ({
          ...prev,
          fullName: nextUser.profile.fullName || prev.fullName,
          phone: nextUser.profile.phone || prev.phone,
          city: nextUser.profile.city || prev.city,
          ageGroup: nextUser.profile.ageGroup || prev.ageGroup,
          gender: nextUser.profile.gender || prev.gender,
          role: nextUser.profile.role || prev.role,
          emergencyEmail: nextUser.profile.emergencyEmail || prev.emergencyEmail,
          email: nextUser.email || prev.email,
        }));
      }
    }, (error) => {
      setAuthError(error.message || "Could not load your Firebase profile.");
      setAuthInitializing(false);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  const handleForgotPassword = async () => {
    setAuthError("");
    setAuthNotice("");

    const trimmedEmail = (authForm.email || "").trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAuthError("Please enter a valid email to reset your password.");
      return;
    }

    try {
      const result = await resetPasswordWithEmail({ email: trimmedEmail });
      setAuthNotice(result.message);
    } catch (error) {
      setAuthError(error.message || "Could not send reset instructions.");
    }
  };

  const handleAuthSubmit = async () => {
    setAuthError("");
    setAuthNotice("");

    const trimmedEmail = (authForm.email || "").trim();
    const trimmedPassword = (authForm.password || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        const result = await signUpWithEmail({
          email: trimmedEmail,
          password: trimmedPassword,
          profile: {
            fullName: authForm.fullName,
            phone: authForm.phone,
            city: authForm.city,
            ageGroup: authForm.ageGroup,
            gender: authForm.gender,
            role: normalizeRole(authForm.role || ROLE_VALUES.STUDENT),
            emergencyEmail: authForm.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL,
          },
        });
        setUser(result);
      } else {
        const result = await signInWithEmail({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        setUser(result);
      }
    } catch (error) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthNotice("");
    setAuthLoading(true);

    try {
      const result = await signInWithGoogle();
      setUser(result);
    } catch (error) {
      setAuthError(error.message || "Google sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (profileDraft) => {
    if (!user?.uid) return;
    const saved = await saveUserProfile(user.uid, {
      ...profileDraft,
      uid: user.uid,
      email: user.email || profileDraft.email,
      role: normalizeRole(profileDraft.role || user.profile?.role || ROLE_VALUES.STUDENT),
      emergencyEmail: profileDraft.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL,
    });

    setUser((prev) => ({ ...prev, profile: saved }));
    setProfileEditorOpen(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setAuthMode("login");
    setAuthForm({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      city: "Delhi",
      ageGroup: "18-25",
      gender: "Prefer not to say",
      role: ROLE_VALUES.STUDENT,
      emergencyEmail: DEFAULT_GOVERNMENT_EMAIL,
    });
  };

  // GPS tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timeout = window.setTimeout(() => setLocationStatus("Geolocation not supported"), 0);
      return () => window.clearTimeout(timeout);
    }

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
        setLocationStatus("Live GPS active");
      },
      (error) => {
        console.warn("GPS error:", error.message);
        setLocationStatus("Live location unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // SOS countdown
  useEffect(() => {
    if (!sosActive || sosCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setSosCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sosActive, sosCountdown]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!user?.uid) {
        setTrustedContacts([]);
        setReports([]);
        return;
      }

      try {
        const [contacts, reportsFromFirebase] = await Promise.all([
          fetchTrustedContacts(user.uid),
          fetchCommunityReports(user.uid),
        ]);

        if (cancelled) return;

        setTrustedContacts((contacts || []).map(normalizeContact));
        const normalizedReports = (reportsFromFirebase || []).map(normalizeReport);
        setReports(normalizedReports);
      } catch (error) {
        console.warn("Firebase data load failed", error);
        setTrustedContacts([]);
        setReports([]);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    fetchNearbyFacilities(userLocation)
      .then((items) => {
        if (!cancelled) setFacilities(items);
      })
      .catch((error) => {
        console.warn("Facility lookup failed", error);
        if (!cancelled) setFacilities([]);
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation]);

  // Recalculate routes when weights change
  const handleWeightsChange = useCallback((weights) => {
    setSafetyWeights(weights);

    if (routes.length > 0) {
      const rescored = routes
        .map((route) => scoreRoute(route, reports, facilities, weights))
        .sort((a, b) => b.score - a.score);

      setRoutes(rescored);
      setSelectedRouteId(rescored[0]?.id ?? null);
    }
  }, [routes, reports, facilities]);

  const handleAddContact = async (event) => {
    event.preventDefault();

    const name = newContactName.trim();
    const phone = newContactPhone.trim();

    if (!name || !phone) return;

    const contact = {
      id: `local-contact-${Date.now()}`,
      name,
      phone,
      relation: newContactRelation.trim() || "Trusted Contact",
      status: "Active",
    };

    setTrustedContacts((prev) => [...prev, contact]);

    try {
      if (user?.uid) {
        const saved = await saveTrustedContact(user.uid, contact);
        setTrustedContacts((prev) =>
          prev.map((item) => (item.id === contact.id ? normalizeContact(saved) : item))
        );
      }
    } catch (error) {
      console.warn("Contact save failed", error);
    }

    setNewContactName("");
    setNewContactPhone("");
    setNewContactRelation("");
  };

  const handleDeleteContact = async (id) => {
    setTrustedContacts((prev) => prev.filter((c) => c.id !== id));

    try {
      if (user?.uid) {
        await deleteTrustedContact(user.uid, id);
      }
    } catch (error) {
      console.warn("Delete failed", error);
    }
  };

  const handleAddReport = async (event) => {
    event.preventDefault();

    if (!newReportTitle.trim()) return;

    const category = autoCategorizeReport(newReportTitle, newReportDescription) || newReportCategory;

    const report = {
      title: newReportTitle.trim(),
      category,
      location: newReportLocation.trim() || "Current location",
      description: newReportDescription.trim(),
      image: newReportImage || null,
      coords: userLocation,
      created_at: new Date().toISOString(),
      upvotes: 1,
      verified: false,
      source: "Community",
      user_id: user?.uid || `guest-${Date.now()}`,
      moderation: { status: "approved", score: 0, reason: "Standard review" },
    };

    const moderation = assessReportModeration(report, reports);
    const normalized = normalizeReport({
      ...report,
      moderation,
      status: moderation.status,
    });
    if (moderation.status !== "spam") {
      setReports((prev) => [normalized, ...prev]);
    }

    try {
      if (user?.uid) {
        await saveCommunityReport(user.uid, {
          ...report,
          id: normalized.id,
          moderation,
        });
      }
    } catch (error) {
      console.warn("Report save failed", error);
    }

    setNewReportTitle("");
    setNewReportCategory("Lighting");
    setNewReportLocation("");
    setNewReportDescription("");
    setNewReportImage("");
  };

  const handleReportImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => setNewReportImage(String(reader.result));
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleUpvote = async (id) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r
      )
    );

    const report = reports.find((r) => r.id === id);
    if (!report || String(id).startsWith("local-")) return;

    try {
      if (user?.uid) {
        await upvoteCommunityReport(user.uid, id, report.upvotes || 0);
      }
    } catch (error) {
      console.warn("Upvote failed", error);
    }
  };

  const handleSearchRoutes = async (event) => {
    event.preventDefault();

    if (!destination.trim()) return;

    setSearchError("");
    setIsSearching(true);
    setRoutesSearched(false);

    try {
      const start = await geocodePlace(startLocation, userLocation);
      const dest = await geocodePlace(destination, userLocation);

      const routesFromApi = await fetchRoutes(
        start.coords,
        dest.coords,
        travelMode === "walking" ? "foot" : "driving"
      );

      const scored = routesFromApi
        .map((route) => scoreRoute(route, reports, facilities, safetyWeights))
        .sort((a, b) => b.score - a.score)
        .map((route, idx) => ({
          ...route,
          rank: idx + 1,
        }));

      setRoutes(scored);
      setSelectedRouteId(scored[0]?.id ?? null);
      setRoutesSearched(true);
    } catch (error) {
      setSearchError(error?.message || "Route calculation failed");
      setRoutes([]);
      setSelectedRouteId(null);
    } finally {
      setIsSearching(false);
    }
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const emergencyMessage = buildEmergencyMessage(userLocation, selectedRoute);

  const triggerEmergencySOS = async () => {
    const governmentEmail = user?.profile?.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL;
    const eventData = {
      uid: user?.uid,
      profile: user?.profile || { fullName: authForm.fullName || "User", email: authForm.email || user?.email },
      userLocation,
      destination: destination || startLocation || "Current route",
      selectedRoute,
      governmentEmail,
    };

    try {
      const resp = await logEmergencyEvent(eventData);
      if (resp?.id) setLastSosId(resp.id);
    } catch (error) {
      console.warn("SOS event logging failed", error);
    }
    setSosActive(true);
    setSosCountdown(15);
  };

  const notifyContact = async (contact) => {
    const phone = normalizePhone(contact.phone);

    if (!phone) {
      setShareStatus("Invalid phone number");
      return;
    }

    const encoded = encodeURIComponent(emergencyMessage);
    const whatsappUrl = `https://wa.me/${phone}?text=${encoded}`;

    try {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setShareStatus(`WhatsApp opened for ${contact.name}`);
    } catch {
      setShareStatus("Failed to open WhatsApp");
    }
  };

  const theme = stealthMode
    ? {
        page: "bg-slate-950 text-slate-100",
        card: "bg-slate-900 border-slate-800",
      }
    : {
        page: "bg-gradient-to-br from-sky-50 via-indigo-50/40 to-teal-50/50",
        card: "bg-white border-slate-200",
      };

  const profileData = useMemo(
    () =>
      user?.profile || {
        ...defaultProfile,
        email: user?.email || authForm.email,
        fullName: authForm.fullName || "User",
        city: authForm.city,
        ageGroup: authForm.ageGroup,
        gender: authForm.gender,
        role: normalizeRole(authForm.role || ROLE_VALUES.STUDENT),
        phone: authForm.phone,
        emergencyEmail: authForm.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL,
      },
    [
      user?.profile,
      user?.email,
      authForm.email,
      authForm.fullName,
      authForm.city,
      authForm.ageGroup,
      authForm.gender,
      authForm.role,
      authForm.phone,
      authForm.emergencyEmail,
    ]
  );

  const currentUserRole = normalizeRole(profileData.role || ROLE_VALUES.STUDENT);
  const isGuardianMode = isGuardianRole(currentUserRole);
  const isPoliceMode = isPoliceRole(currentUserRole);
  const isStudentMode = isStudentRole(currentUserRole);

  useEffect(() => {
    if (!user?.uid || !isStudentMode) return;

    const timeout = window.setTimeout(() => {
      upsertActiveJourney(user.uid, profileData, {
        userLocation,
        destination: destination || "",
        routeName: selectedRoute?.name || "",
        routeScore: selectedRoute?.score ?? null,
        status: routesSearched ? "journey-active" : "location-shared",
      }).catch((error) => {
        console.warn("Active journey sync failed", error);
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [
    user?.uid,
    isStudentMode,
    userLocation,
    destination,
    selectedRoute?.name,
    selectedRoute?.score,
    routesSearched,
    profileData,
  ]);

  // Student: subscribe to their own SOS events so UI updates in real time
  useEffect(() => {
    if (!user?.uid || !isStudentMode) return;

    const unsubscribe = subscribeSosEvents(
      { uid: user.uid, role: ROLE_VALUES.STUDENT },
      (items) => {
        const mine = (items || []).filter((it) => it.uid === user.uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setStudentAlerts(mine);
      },
      (err) => console.warn("Could not subscribe to SOS events for student", err)
    );

    return () => unsubscribe();
  }, [user?.uid, isStudentMode]);

  useEffect(() => {
    if (!lastSosId || !sosActive || !isStudentMode) return;
    updateEmergencyEventLocation(lastSosId, userLocation).catch((error) => {
      console.warn("Live SOS location sync failed", error);
    });
  }, [lastSosId, sosActive, isStudentMode, userLocation]);

  const handleMapFilterToggle = (filterKey) => {
    setMapFilters((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey] !== false ? false : true,
    }));
  };

  // Analyze reports for AI confidence
  const reportsWithConfidence = useMemo(
    () =>
      reports.map((report) => {
        const moderation = assessReportModeration(report, reports);
        return {
          ...report,
          moderation,
          analysis: analyzeReportQuality(report, reports),
        };
      }),
    [reports]
  );

  const reportBuckets = useMemo(() => {
    const buckets = {
      all: reportsWithConfidence,
      approved: reportsWithConfidence.filter((report) => (report.moderation?.status || "approved") === "approved"),
      pending_review: reportsWithConfidence.filter((report) => (report.moderation?.status || "approved") === "pending_review"),
      spam: reportsWithConfidence.filter((report) => (report.moderation?.status || "approved") === "spam"),
    };
    return buckets;
  }, [reportsWithConfidence]);

  const visibleReports = reportBuckets[reportView] || reportBuckets.all;

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-sky-200 bg-white px-5 py-4 text-sm font-bold text-sky-700 shadow-sm">
          Checking Firebase session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authLoading={authLoading}
        authError={authError}
        authNotice={authNotice}
        onSubmit={handleAuthSubmit}
        onGoogleSignIn={handleGoogleSignIn}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  if (isGuardianMode) {
    return (
      <>
        <GuardianDashboard
          user={user}
          profile={profileData}
          onLogout={handleLogout}
          onProfile={() => setProfileEditorOpen(true)}
        />
        {profileEditorOpen && (
          <ProfileEditor profile={profileData} onClose={() => setProfileEditorOpen(false)} onSave={handleSaveProfile} />
        )}
      </>
    );
  }

  if (isPoliceMode) {
    return (
      <>
        <PoliceDashboard
          user={user}
          profile={profileData}
          onLogout={handleLogout}
          onProfile={() => setProfileEditorOpen(true)}
        />
        {profileEditorOpen && (
          <ProfileEditor profile={profileData} onClose={() => setProfileEditorOpen(false)} onSave={handleSaveProfile} />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen ${theme.page} flex flex-col`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-[var(--z-navbar)] backdrop-blur-xl border-b ${
          stealthMode
            ? "bg-slate-950/90 border-slate-800"
            : "bg-white/90 border-sky-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button
            onClick={() => setActiveTab("routes")}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className={stealthMode ? "text-white" : "text-slate-900"}>
                <div className="text-xl font-black">SafeRoute</div>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-sky-600">
                Safety Intelligence
              </div>
            </div>
          </button>

          <nav
            className={`hidden md:flex items-center gap-1 p-1.5 rounded-2xl border ${
              stealthMode
                ? "bg-slate-900 border-slate-800"
                : "bg-sky-50 border-sky-100"
            }`}
          >
            {[
              ["routes", "Routes", Navigation],
              ["map", "Map", MapPin],
              ["trusted", "Trusted", Users],
              ["reports", "Reports", AlertTriangle],
              ["account", "Account", Users],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  activeTab === id
                    ? "bg-sky-600 text-white shadow-md"
                    : stealthMode
                    ? "text-slate-300 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-sky-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStealthMode(!stealthMode)}
              className={`hidden sm:block px-3 py-2 rounded-xl border text-xs font-bold ${
                stealthMode
                  ? "bg-slate-800 border-slate-700 text-sky-400"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              {stealthMode ? "Stealth" : "Standard"}
            </button>

            <button
              onClick={() => setProfileEditorOpen(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              title="Edit profile"
            >
              <Users className="w-4 h-4" />
              {profileData.fullName || "Profile"}
            </button>

            <button
              onClick={triggerEmergencySOS}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg"
            >
              <BellRing className="w-4 h-4" />
              SOS
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className={`md:hidden border-t p-3 space-y-2 ${
              stealthMode
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-sky-100"
            }`}
          >
            {[
              ["routes", "Routes"],
              ["map", "Map"],
              ["trusted", "Trusted Circle"],
              ["reports", "Reports"],
              ["account", "Account"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-100 text-sm font-semibold"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Status bar */}
      <div className="bg-slate-950 text-slate-300 px-4 sm:px-6 py-2 text-[11px] font-mono">
        {locationStatus}
      </div>

      {isStudentMode && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <VoiceSosControl userId={user?.uid} onTrigger={triggerEmergencySOS} />
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ROUTE PLANNER TAB */}
        {activeTab === "routes" && (
          <div className="space-y-6">
            {/* Search section */}
            <section className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl`}>
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider">
                  <Compass className="w-4 h-4" />
                  Route planning
                </div>

                <h1
                  className={`text-4xl sm:text-5xl font-black mt-3 leading-tight ${
                    stealthMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Find your safest route
                </h1>

                <p className={`text-base mt-4 leading-relaxed ${stealthMode ? "text-slate-300" : "text-slate-700"}`}>
                  SafeRoute analyzes community data, infrastructure, and your preferences to recommend the best route for you.
                </p>
              </div>

              <form
                onSubmit={handleSearchRoutes}
                className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end"
              >
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Start</label>
                  <input
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-2xl px-4 py-3.5 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Destination</label>
                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. NSUT, DTU, Rohini"
                    className="w-full mt-1 border border-slate-200 rounded-2xl px-4 py-3.5 bg-slate-50"
                    required
                  />
                </div>

                <button
                  disabled={isSearching}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-2xl px-6 py-3.5 flex items-center justify-center gap-2"
                >
                  {isSearching ? "Calculating..." : "Find Routes"}
                  {!isSearching && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {searchError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700">
                  {searchError}
                </div>
              )}
            </section>

            {/* Safety preferences */}
            {routesSearched && (
              <SafetyPreferencePanel
                onWeightsChange={handleWeightsChange}
                presets={SAFETY_PRESETS}
                initialWeights={safetyWeights}
              />
            )}

            {/* Routes */}
            {routesSearched && routes.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-4">
                    <TrendingUp className="w-4 h-4" />
                    Route alternatives
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {routes.map((route) => (
                      <RouteComparisonCard
                        key={route.id}
                        route={route}
                        isRecommended={route.rank === 1}
                        isSelected={route.id === selectedRouteId}
                        onSelect={(id) => setSelectedRouteId(id)}
                        onViewDetails={() => {
                          // Could open detailed view
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Route detail and map */}
                {selectedRoute && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Explanation */}
                    <div className={`${theme.card} border rounded-3xl p-5 shadow-lg space-y-4`}>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-sky-600">
                          Why this route
                        </div>
                        <h3 className={`text-lg font-bold mt-2 ${
                          stealthMode ? "text-white" : "text-slate-900"
                        }`}>
                          {selectedRoute.name}
                        </h3>
                      </div>

                      <div className={`rounded-2xl border p-4 ${
                        selectedRoute.riskTone === "good"
                          ? "bg-emerald-50 border-emerald-200"
                          : selectedRoute.riskTone === "warn"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-rose-50 border-rose-200"
                      }`}>
                        <div className="text-3xl font-black text-slate-900">
                          {selectedRoute.score}
                          <span className="text-sm text-slate-400">/100</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {selectedRoute.riskLabel}
                        </div>
                      </div>

                      {selectedRoute.explanation && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold uppercase text-slate-500">Key factors</div>
                          {selectedRoute.explanation.map((item, idx) => (
                            <div key={idx} className="flex gap-2 text-xs text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-[11px] text-blue-800">
                        Safety score is a decision-support indicator, not a guarantee.
                      </div>
                    </div>

                    {/* Map */}
                    <div className={`${theme.card} border rounded-3xl p-4 shadow-lg`}>
                      <h3 className="font-bold text-slate-900 mb-3">Route map</h3>
                      <div className="map-stack h-[430px] rounded-2xl overflow-hidden border border-slate-200">
                        <MapView
                          userLocation={userLocation}
                          reports={reportsWithConfidence}
                          facilities={facilities}
                          routes={routes}
                          selectedRouteId={selectedRouteId}
                          filters={mapFilters}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {routesSearched && routes.length === 0 && !searchError && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
                <RouteIcon className="w-8 h-8 mx-auto text-slate-400" />
                <div className="font-bold text-slate-700 mt-3">No routes found</div>
              </div>
            )}
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === "map" && (
          <section className="space-y-6">
            <div className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl`}>
              <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Layers3 className="w-4 h-4" />
                Context layers
              </div>
              <h2 className={`text-4xl sm:text-5xl font-black leading-tight ${
                stealthMode ? "text-white" : "text-slate-900"
              }`}>
                Safety Map
              </h2>
              <p className={`text-base mt-4 leading-relaxed ${stealthMode ? "text-slate-300" : "text-slate-700"}`}>
                View safety zones, facilities, reports and routes on the interactive map below.
              </p>
            </div>

            {/* Map section with controls below */}
            <div className={`${theme.card} border rounded-3xl p-4 shadow-xl space-y-4`}>
              <div className="map-stack relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200" style={{ height: "500px", minHeight: "400px" }}>
                <MapView
                  userLocation={userLocation}
                  reports={reportsWithConfidence}
                  facilities={facilities}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  filters={mapFilters}
                  layerVisibility={mapLayerVisibility}
                />

                {/* Floating Legend - top left */}
                <div className="absolute top-4 left-4 z-[var(--z-floating)] flex items-start gap-2">
                  <SafetyLegend
                    isExpanded={legendExpanded}
                    onToggle={() => setLegendExpanded(!legendExpanded)}
                  />
                  <div className="relative">
                    <button
                      type="button"
                      title="Map layers"
                      aria-label="Map layers"
                      onClick={() => setLayerControlOpen(!layerControlOpen)}
                      className="map-layer-button bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-slate-700 hover:bg-slate-50"
                    >
                      {layerControlOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {layerControlOpen && (
                      <div className="absolute top-12 left-0 w-56 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-3 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Map layers</div>
                        {[
                          ["safetyZones", "Safety Zones"],
                          ["facilities", "Facilities"],
                          ["communityReports", "Community Reports"],
                          ["alternateRoute", "Alternate Route"],
                        ].map(([key, label]) => (
                          <label key={key} className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                            <span>{label}</span>
                            <input
                              type="checkbox"
                              checked={mapLayerVisibility[key] !== false}
                              onChange={() => setMapLayerVisibility((previous) => ({ ...previous, [key]: previous[key] === false }))}
                              className="accent-sky-600"
                            />
                          </label>
                        ))}
                        <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500">Primary safe route and current location stay visible.</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Map filters below the map */}
              <div className="bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Layers3 className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-slate-900 text-base">Map Layers & Filters</h3>
                </div>

                <MapFilterPanel
                  filters={mapFilters}
                  onToggle={handleMapFilterToggle}
                  onShowAll={() => setMapFilters(Object.fromEntries(
                    Object.keys(mapFilters).map(k => [k, true])
                  ))}
                  onClearAll={() => setMapFilters(Object.fromEntries(
                    Object.keys(mapFilters).map(k => [k, false])
                  ))}
                  position="inline"
                />
              </div>
            </div>
          </section>
        )}

        {/* TRUSTED CIRCLE TAB */}
        {activeTab === "trusted" && (
          <section className="space-y-6">
            <div className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl`}>
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                Emergency support
              </div>
              <h2 className={`text-4xl sm:text-5xl font-black leading-tight ${
                stealthMode ? "text-white" : "text-slate-900"
              }`}>
                Trusted Circle
              </h2>
              <p className={`text-base mt-4 leading-relaxed ${stealthMode ? "text-slate-300" : "text-slate-700"}`}>
                Add trusted contacts who will receive emergency alerts when you trigger SOS.
              </p>
            </div>

            <form
              onSubmit={handleAddContact}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-6 bg-sky-50 border border-sky-100 rounded-3xl"
            >
              <input
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Name"
                className="border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium"
                required
              />
              <input
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+91..."
                className="border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium"
                required
              />
              <input
                value={newContactRelation}
                onChange={(e) => setNewContactRelation(e.target.value)}
                placeholder="Relation"
                className="border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium"
              />
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 py-3"
              >
                <PlusCircle className="w-4 h-4" />
                Add
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trustedContacts.map((contact) => (
                <div key={contact.id} className="border border-slate-200 bg-white rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{contact.name}</h3>
                      <div className="text-sm text-sky-600 font-semibold mt-1">
                        {contact.relation}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-sm text-slate-600 space-y-2 mb-4 bg-slate-50 p-3 rounded-xl">
                    <div>📞 {contact.phone}</div>
                    <div>⚡ {contact.status}</div>
                  </div>

                  <a
                    href={`tel:${contact.phone}`}
                    className="w-full py-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                  >
                    <Phone className="w-4 h-4 text-sky-600" />
                    Call
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <section className="space-y-6">
            <div className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl`}>
              <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-2">
                <Users className="w-4 h-4" />
                Profile & security
              </div>
              <h2 className={`text-4xl sm:text-5xl font-black leading-tight ${stealthMode ? "text-white" : "text-slate-900"}`}>
                Account settings
              </h2>
              <p className={`text-base mt-4 ${stealthMode ? "text-slate-300" : "text-slate-700"}`}>
                Manage your profile, emergency details, and safety preferences securely.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className={`${theme.card} border rounded-3xl p-6 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-sky-600">User</div>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">{profileData.fullName || "Your profile"}</h3>
                  </div>
                  <button
                    onClick={() => setProfileEditorOpen(true)}
                    className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Email</span><span className="font-semibold text-slate-800">{user?.email || authForm.email || "Not added"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Phone</span><span className="font-semibold text-slate-800">{profileData.phone || "Not added"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>City</span><span className="font-semibold text-slate-800">{profileData.city || "Not added"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Age</span><span className="font-semibold text-slate-800">{profileData.ageGroup || "Not added"}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Role</span><span className="font-semibold text-slate-800">{profileData.role || "Not added"}</span></div>
                  <div className="flex justify-between pb-2"><span>Government email</span><span className="font-semibold text-slate-800">{profileData.emergencyEmail || DEFAULT_GOVERNMENT_EMAIL}</span></div>
                </div>
              </div>

              <div className={`${theme.card} border rounded-3xl p-6 shadow-xl`}>
                <div className="text-xs font-bold uppercase tracking-wide text-sky-600">Safety preferences</div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Current route weighting</h3>
                <div className="space-y-4 mt-6">
                  {Object.entries(safetyWeights).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm font-semibold mb-1 text-slate-600">
                        <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Submit report */}
            <section className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl`}>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  Community reports
                </div>
                <h2 className={`text-4xl sm:text-5xl font-black leading-tight mt-3 ${
                  stealthMode ? "text-white" : "text-slate-900"
                }`}>
                  Report Safety Issues
                </h2>
              </div>

              <form onSubmit={handleAddReport} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Issue Title</label>
                  <input
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    placeholder="e.g. Broken streetlight near gate 2"
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-sky-400 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Additional Details</label>
                  <textarea
                    value={newReportDescription}
                    onChange={(e) => setNewReportDescription(e.target.value)}
                    placeholder="Provide more information to help others stay safe"
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-sky-400 outline-none transition h-24 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Add Photo Evidence</label>
                    {newReportImage && <span className="text-[10px] font-black uppercase tracking-wide text-sky-600">Image selected</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-bold cursor-pointer hover:bg-sky-100">
                      <ImagePlus className="w-4 h-4" />
                      {newReportImage ? "Replace photo" : "Add Photo"}
                      <input type="file" accept="image/*" onChange={handleReportImageChange} className="sr-only" />
                    </label>
                    {newReportImage && (
                      <div className="relative w-28 h-20">
                        <img src={newReportImage} alt="Selected report evidence preview" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                        <button type="button" onClick={() => setNewReportImage("")} className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1" aria-label="Remove photo">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Category</label>
                    <select
                      value={newReportCategory}
                      onChange={(e) => setNewReportCategory(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-sky-400 outline-none transition"
                    >
                      <option>Lighting</option>
                      <option>Suspicious Activity</option>
                      <option>Road Hazard</option>
                      <option>Harassment Concern</option>
                      <option>Unsafe Environment</option>
                      <option>Police Presence</option>
                      <option>Positive Safety Observation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Location Name</label>
                    <input
                      value={newReportLocation}
                      onChange={(e) => setNewReportLocation(e.target.value)}
                      placeholder="e.g. Main Gate, Park Street"
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium bg-slate-50 focus:bg-white focus:border-sky-400 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-base transition-all shadow-md hover:shadow-lg"
                >
                  <PlusCircle className="w-5 h-5" />
                  Submit Report
                </button>
              </form>
            </section>

            {/* Reports list */}
            <section className={`${theme.card} border rounded-3xl p-6 sm:p-8 shadow-xl space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className={`text-2xl font-black ${stealthMode ? "text-white" : "text-slate-900"}`}>
                  Recent Reports ({reportsWithConfidence.length})
                </h3>

                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "All"],
                    ["approved", "Approved"],
                    ["pending_review", "Pending Review"],
                    ["spam", "Spam Review"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setReportView(key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                        reportView === key
                          ? "bg-sky-600 text-white border-sky-700"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {visibleReports.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                    <p className="text-base">No reports in this category yet.</p>
                  </div>
                ) : (
                  visibleReports.map((report) => (
                    <div
                      key={report.id}
                      className="border border-slate-200 bg-white rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-sky-300 transition-all"
                      onClick={() => setSelectedReport(report)}
                    >
                      {report.image && (
                        <button type="button" className="block w-full mb-4 text-left group" onClick={(event) => { event.stopPropagation(); setPhotoPreview(report); }}>
                          <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-slate-100">
                            <img src={report.image} alt={`${report.title} evidence`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          </div>
                        </button>
                      )}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <StatusPill tone="blue">{report.category}</StatusPill>
                            <StatusPill tone={report.analysis.confidence >= 70 ? "good" : "warn"}>
                              {report.analysis.confidence}% confidence
                            </StatusPill>
                            {report.moderation?.status !== "approved" && (
                              <StatusPill tone={report.moderation?.status === "spam" ? "danger" : "warn"}>
                                {report.moderation?.status === "spam" ? "Spam flagged" : "Pending review"}
                              </StatusPill>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-base">{report.title}</h4>
                          <p className="text-sm text-slate-600 mt-2">📍 {report.location}</p>
                          <p className="text-xs text-slate-500 mt-1">🕒 {formatDashboardTime(report.created_at)}</p>
                          {report.moderation?.reason && (
                            <p className="text-[11px] text-slate-500 mt-2">Moderation: {report.moderation.reason}</p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpvote(report.id);
                          }}
                          className="shrink-0 px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm font-bold hover:bg-sky-100 transition-all"
                        >
                          👍 {report.upvotes}
                        </button>
                      </div>
                      <button type="button" onClick={() => setSelectedReport(report)} className="text-sm font-bold text-sky-700 hover:text-sky-900">View Report <ArrowRight className="inline w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {profileEditorOpen && (
        <ProfileEditor
          profile={profileData}
          onClose={() => setProfileEditorOpen(false)}
          onSave={(draft) => {
            handleSaveProfile(draft);
          }}
        />
      )}

      {/* Report detail modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[var(--z-overlay)] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full">
            <ReportDetailPanel
              report={selectedReport}
              allReports={reports}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        </div>
      )}

      {photoPreview && (
        <div className="fixed inset-0 z-[var(--z-modal)] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPhotoPreview(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-3xl p-3 sm:p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-5 right-5 z-10 rounded-full bg-slate-950/80 text-white p-2" aria-label="Close photo preview">
              <X className="w-5 h-5" />
            </button>
            <img src={photoPreview.image} alt={`${photoPreview.title} enlarged evidence`} className="w-full max-h-[70vh] object-contain rounded-2xl bg-slate-100" />
            <div className="px-2 pt-4">
              <div className="text-[10px] font-black uppercase tracking-wide text-sky-600">Report evidence</div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{photoPreview.title}</h2>
              <p className="text-sm text-slate-600 mt-1">Evidence attached to this report</p>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-[var(--z-critical)] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-black uppercase tracking-wider">
                  <BellRing className="w-4 h-4" />
                  Emergency SOS
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-2">Alert active</h2>
              </div>

              <button
                onClick={() => setSosActive(false)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="text-4xl font-black text-rose-600">{sosCountdown}s</div>
            </div>

            <div className="space-y-2">
              {trustedContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => notifyContact(contact)}
                  className="w-full border border-slate-200 bg-white hover:bg-slate-50 rounded-2xl p-3 text-left flex items-center justify-between"
                >
                  <span>
                    <span className="block text-sm font-bold text-slate-900">
                      Notify {contact.name}
                    </span>
                    <span className="block text-[11px] text-slate-500">{contact.phone}</span>
                  </span>
                  <span className="text-xs font-bold text-sky-700">WhatsApp</span>
                </button>
              ))}
            </div>

            {/* Live SOS status for student */}
            <div className="mt-4 border-t pt-3">
              <div className="text-sm font-bold mb-2">Live emergency status</div>
              {studentAlerts.length === 0 ? (
                <div className="text-sm text-slate-500">Alert sent — waiting for delivery to dashboards.</div>
              ) : (
                (() => {
                  const latest = studentAlerts[0];
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>Guardian notified</div>
                        <div className="font-bold">{latest.notified?.guardians ? "✓" : "—"}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>Police notified</div>
                        <div className="font-bold">{latest.notified?.police ? "✓" : "—"}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>Alert status</div>
                        <div className="font-bold">{(latest.status || "active").toUpperCase()}</div>
                      </div>
                      <div className="text-xs text-slate-500">Last update: {formatDashboardTime(latest.updatedAt || latest.createdAt)}</div>
                    </div>
                  );
                })()
              )}
            </div>

            {shareStatus && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-xs text-sky-800">
                {shareStatus}
              </div>
            )}

            <button
              onClick={() => setSosActive(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-2xl"
            >
              I am safe — close alert
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={handleLogout}
          className="bg-slate-900 text-white px-4 py-2 rounded-2xl border border-slate-700 text-xs font-bold shadow-lg"
        >
          Logout
        </button>
      </div>

      <footer className="bg-slate-950 text-slate-400 py-6 px-4 text-center text-xs mt-auto">
        <div className="font-bold text-slate-300">
          SafeRoute • AI-Assisted Safety Navigation
        </div>
        <div className="mt-2 text-[10px] text-slate-500">
          Decision-support system. Not a guarantee of safety.
        </div>
      </footer>
    </div>
  );
}
