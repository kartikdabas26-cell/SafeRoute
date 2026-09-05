/**
 * demoData.js
 * Comprehensive demo data for SafeRoute MVP
 * Includes realistic facilities, reports, and locations around Delhi
 */

export const DEMO_PLACES = {
  nsut: [28.6139, 77.0357],
  "netaji subhas university of technology": [28.6139, 77.0357],
  dtu: [28.7501, 77.1177],
  "delhi technological university": [28.7501, 77.1177],
  rohini: [28.7495, 77.1100],
  "rohini sector 16": [28.7415, 77.1080],
  "connaught place": [28.6315, 77.2167],
  "india gate": [28.6129, 77.2295],
  "kashmere gate": [28.6675, 77.2282],
  "chandni chowk": [28.6505, 77.2303],
  "cp": [28.6315, 77.2167],
  "lajpat nagar": [28.5621, 77.2258],
  "new delhi railway station": [28.6431, 77.2197],
  "aiims delhi": [28.5890, 77.2015],
  "delhi airport": [28.5562, 77.1000],
};

/**
 * Demo facilities: Police, Hospitals, Pharmacies, Washrooms, Help Points
 */
export const DEMO_FACILITIES = [
  // Police Stations
  {
    id: "fac-police-1",
    name: "Delhi Police Station — Rohini",
    category: "Police",
    coords: [28.7495, 77.1100],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2748-8555",
    source: "Demo",
  },
  {
    id: "fac-police-2",
    name: "Delhi Police — North Campus",
    category: "Police",
    coords: [28.6139, 77.0357],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2742-5000",
    source: "Demo",
  },
  {
    id: "fac-police-3",
    name: "Delhi Police — CP",
    category: "Police",
    coords: [28.6315, 77.2167],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2336-2000",
    source: "Demo",
  },

  // Hospitals
  {
    id: "fac-hospital-1",
    name: "AIIMS Delhi",
    category: "Hospital",
    coords: [28.5890, 77.2015],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2658-8500",
    source: "Demo",
  },
  {
    id: "fac-hospital-2",
    name: "Max Healthcare — Rohini",
    category: "Hospital",
    coords: [28.7545, 77.0821],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-4015-0000",
    source: "Demo",
  },
  {
    id: "fac-hospital-3",
    name: "Apollo Hospital — Delhi",
    category: "Hospital",
    coords: [28.5621, 77.2258],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-4107-1234",
    source: "Demo",
  },
  {
    id: "fac-hospital-4",
    name: "Batra Hospital — Delhi",
    category: "Hospital",
    coords: [28.5810, 77.2410],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-4141-7777",
    source: "Demo",
  },

  // Clinics
  {
    id: "fac-clinic-1",
    name: "Primary Health Center — Rohini Sector 16",
    category: "Clinic",
    coords: [28.7415, 77.1080],
    verified: true,
    accessible: true,
    operatingHours: "8 AM - 6 PM",
    phone: "+91-11-2748-1234",
    source: "Demo",
  },
  {
    id: "fac-clinic-2",
    name: "Community Health Center — North Delhi",
    category: "Clinic",
    coords: [28.6200, 77.0450],
    verified: true,
    accessible: false,
    operatingHours: "9 AM - 5 PM",
    phone: "+91-11-2742-9876",
    source: "Demo",
  },

  // Pharmacies
  {
    id: "fac-pharmacy-1",
    name: "Apollo Pharmacy — Rohini",
    category: "Pharmacy",
    coords: [28.7500, 77.1050],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2748-5555",
    source: "Demo",
  },
  {
    id: "fac-pharmacy-2",
    name: "Medicine Point — NSUT Corridor",
    category: "Pharmacy",
    coords: [28.6139, 77.0357],
    verified: false,
    accessible: true,
    operatingHours: "10 AM - 11 PM",
    phone: "+91-98765-43210",
    source: "Demo",
  },
  {
    id: "fac-pharmacy-3",
    name: "24x7 Pharmacy — Connaught Place",
    category: "Pharmacy",
    coords: [28.6315, 77.2167],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "+91-11-2336-5555",
    source: "Demo",
  },

  // Washrooms
  {
    id: "fac-washroom-1",
    name: "Public Restroom — Rohini Central",
    category: "Washroom",
    coords: [28.7495, 77.1150],
    verified: true,
    accessible: true,
    operatingHours: "6 AM - 10 PM",
    phone: "N/A",
    source: "Demo",
  },
  {
    id: "fac-washroom-2",
    name: "Sanitation Facility — CP",
    category: "Washroom",
    coords: [28.6325, 77.2170],
    verified: false,
    accessible: true,
    operatingHours: "8 AM - 8 PM",
    phone: "N/A",
    source: "Demo",
  },

  // Help Points
  {
    id: "fac-help-1",
    name: "Women Safety Helpdesk — Rohini Station",
    category: "Help Point",
    coords: [28.7415, 77.1180],
    verified: true,
    accessible: true,
    operatingHours: "24/7",
    phone: "1091",
    source: "Demo",
  },
  {
    id: "fac-help-2",
    name: "Emergency Help Point — NSUT Campus",
    category: "Help Point",
    coords: [28.6139, 77.0357],
    verified: true,
    accessible: false,
    operatingHours: "7 AM - 10 PM",
    phone: "0-20-2696-1012",
    source: "Demo",
  },
  {
    id: "fac-help-3",
    name: "Travel Assistance — CP Station",
    category: "Help Point",
    coords: [28.6325, 77.2185],
    verified: true,
    accessible: true,
    operatingHours: "6 AM - 11 PM",
    phone: "1800-111-555",
    source: "Demo",
  },

  // Support Centers
  {
    id: "fac-support-1",
    name: "SafeRoute Support Center — Rohini",
    category: "Support Center",
    coords: [28.7495, 77.1100],
    verified: true,
    accessible: true,
    operatingHours: "9 AM - 8 PM",
    phone: "+91-11-2748-1111",
    source: "Demo",
  },
];

// Dedicated map showcase fixtures. These are simulated locations for demos only.
export const DEMO_MAP_FACILITIES = [
  { id: "map-police-1", name: "Demo Police Station — Rohini", category: "Police", coords: [28.718, 77.078] },
  { id: "map-police-2", name: "Demo Police Response Unit — Campus", category: "Police", coords: [28.704, 77.061] },
  { id: "map-police-3", name: "Demo Police Station — Pitampura", category: "Police", coords: [28.735, 77.104] },
  { id: "map-police-4", name: "Demo Police Station — Model Town", category: "Police", coords: [28.716, 77.147] },
  { id: "map-hospital-1", name: "Demo City Hospital", category: "Hospital", coords: [28.686, 77.102] },
  { id: "map-hospital-2", name: "Demo North Delhi Hospital", category: "Hospital", coords: [28.744, 77.071] },
  { id: "map-hospital-3", name: "Demo Community Hospital", category: "Hospital", coords: [28.694, 77.151] },
  { id: "map-clinic-1", name: "Demo Wellness Clinic", category: "Clinic", coords: [28.727, 77.063] },
  { id: "map-clinic-2", name: "Demo Family Clinic", category: "Clinic", coords: [28.676, 77.129] },
  { id: "map-clinic-3", name: "Demo Neighborhood Clinic", category: "Clinic", coords: [28.752, 77.119] },
  { id: "map-clinic-4", name: "Demo Care Clinic", category: "Clinic", coords: [28.705, 77.171] },
  { id: "map-pharmacy-1", name: "Demo 24x7 Pharmacy", category: "Pharmacy", coords: [28.708, 77.090] },
  { id: "map-pharmacy-2", name: "Demo Corner Pharmacy", category: "Pharmacy", coords: [28.729, 77.133] },
  { id: "map-pharmacy-3", name: "Demo Health Pharmacy", category: "Pharmacy", coords: [28.668, 77.092] },
  { id: "map-pharmacy-4", name: "Demo Metro Pharmacy", category: "Pharmacy", coords: [28.758, 77.096] },
  { id: "map-help-1", name: "SafeRoute Help Point — Demo", category: "Help Point", coords: [28.699, 77.081] },
  { id: "map-help-2", name: "SafeRoute Help Point — Demo", category: "Help Point", coords: [28.739, 77.151] },
  { id: "map-help-3", name: "SafeRoute Help Point — Demo", category: "Help Point", coords: [28.671, 77.157] },
  { id: "map-support-1", name: "Demo Support Center — North", category: "Support Center", coords: [28.723, 77.184] },
  { id: "map-support-2", name: "Demo Support Center — West", category: "Support Center", coords: [28.672, 77.061] },
  { id: "map-washroom-1", name: "Demo Public Washroom", category: "Washroom", coords: [28.714, 77.116] },
  { id: "map-washroom-2", name: "Demo Transit Washroom", category: "Washroom", coords: [28.689, 77.073] },
  { id: "map-washroom-3", name: "Demo Park Washroom", category: "Washroom", coords: [28.751, 77.164] },
];

export const DEMO_SAFETY_ZONES = [
  { id: "zone-green", name: "Lower concern zone", center: [28.713, 77.092], radius: 1450, color: "#22c55e", score: "80–100" },
  { id: "zone-yellow", name: "Moderate concern zone", center: [28.731, 77.145], radius: 1050, color: "#eab308", score: "60–79" },
  { id: "zone-orange", name: "Caution zone", center: [28.684, 77.132], radius: 850, color: "#f97316", score: "40–59" },
  { id: "zone-red", name: "Higher caution pocket", center: [28.748, 77.078], radius: 500, color: "#ef4444", score: "0–39" },
];

export const DEMO_MAP_REPORTS = [
  { id: "map-report-1", title: "Poorly lit street", status: "Community", coords: [28.705, 77.119], risk: "Moderate", reason: "Low lighting + low pedestrian activity", color: "#f97316" },
  { id: "map-report-2", title: "Previous safety incident", status: "Verified", coords: [28.733, 77.091], risk: "Higher", reason: "Recent community-confirmed concern", color: "#dc2626" },
  { id: "map-report-3", title: "Elevated risk pattern detected", status: "AI-Analyzed", coords: [28.677, 77.145], risk: "Moderate", reason: "Low lighting + low pedestrian activity", confidence: 82, color: "#2563eb" },
  { id: "map-report-4", title: "Active pedestrian corridor", status: "Community", coords: [28.721, 77.169], risk: "Lower", reason: "Positive safety observation", color: "#f97316" },
  { id: "map-report-5", title: "Lighting improvement needed", status: "AI-Analyzed", coords: [28.759, 77.137], risk: "Caution", reason: "Lighting pattern needs review", confidence: 74, color: "#2563eb" },
];

export const DEMO_EVIDENCE_IMAGES = [
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=900&q=80",
];

/**
 * Demo community reports: Mix of verified and unverified
 * Includes duplicates to test clustering and confidence scoring
 */
export const DEMO_REPORTS = [
  // Lighting issues (3 related reports to test clustering)
  {
    id: "demo-report-1",
    title: "Streetlight not working near Industrial Alley",
    category: "Lighting",
    location: "Rohini Sector 16",
    coords: [28.715, 77.042],
    created_at: new Date(Date.now() - 12 * 60000),
    upvotes: 24,
    verified: true,
    source: "Demo",
    user_id: "user-1",
  },
  {
    id: "demo-report-2",
    title: "Dark stretch - broken streetlight",
    category: "Lighting",
    location: "Rohini near gate 2",
    coords: [28.7165, 77.0415],
    created_at: new Date(Date.now() - 8 * 60000),
    upvotes: 19,
    verified: true,
    source: "Demo",
    user_id: "user-2",
  },
  {
    id: "demo-report-3",
    title: "No light working around Industrial Alley",
    category: "Lighting",
    location: "Rohini Sector 16",
    coords: [28.714, 77.042],
    created_at: new Date(Date.now() - 5 * 60000),
    upvotes: 12,
    verified: false,
    source: "Demo",
    user_id: "user-3",
  },

  // Police patrol (positive safety signal)
  {
    id: "demo-report-4",
    title: "Police patrol checkpoint reported near main gate",
    category: "Police Presence",
    location: "NSUT Main Gate Corridor",
    coords: [28.613, 77.035],
    created_at: new Date(Date.now() - 45 * 60000),
    upvotes: 41,
    verified: true,
    source: "Demo",
    user_id: "user-4",
  },

  // Safety hazard
  {
    id: "demo-report-5",
    title: "Dark stretch with low pedestrian activity after 10 PM",
    category: "Unsafe Environment",
    location: "Outer Ring Road Crossing",
    coords: [28.702, 77.028],
    created_at: new Date(Date.now() - 120 * 60000),
    upvotes: 18,
    verified: false,
    source: "Demo",
    user_id: "user-5",
  },

  // Suspicious activity
  {
    id: "demo-report-6",
    title: "Suspicious activity near station at night",
    category: "Suspicious Activity",
    location: "Rohini Station",
    coords: [28.7415, 77.1180],
    created_at: new Date(Date.now() - 3 * 60000),
    upvotes: 9,
    verified: false,
    source: "Demo",
    user_id: "user-6",
  },

  // Road hazard
  {
    id: "demo-report-7",
    title: "Large pothole on main road",
    category: "Road Hazard",
    location: "Ring Road Sector 17",
    coords: [28.7365, 77.1052],
    created_at: new Date(Date.now() - 30 * 60000),
    upvotes: 14,
    verified: false,
    source: "Demo",
    user_id: "user-7",
  },

  // Infrastructure issue
  {
    id: "demo-report-8",
    title: "Water leak affecting sidewalk safety",
    category: "Infrastructure Issue",
    location: "Rohini Central",
    coords: [28.7495, 77.1150],
    created_at: new Date(Date.now() - 60 * 60000),
    upvotes: 7,
    verified: false,
    source: "Demo",
    user_id: "user-8",
  },

  // Positive safety signal
  {
    id: "demo-report-9",
    title: "Good security visible - well-lit area",
    category: "Positive Safety Observation",
    location: "CP Market",
    coords: [28.6315, 77.2167],
    created_at: new Date(Date.now() - 90 * 60000),
    upvotes: 33,
    verified: true,
    source: "Demo",
    user_id: "user-9",
  },

  // Old unverified report (should have low confidence)
  {
    id: "demo-report-10",
    title: "Old unverified report about some hazard",
    category: "Safety Hazard",
    location: "Old Location",
    coords: [28.6100, 77.1000],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60000), // 10 days ago
    upvotes: 2,
    verified: false,
    source: "Demo",
    user_id: "user-10",
  },
];

/**
 * Demo trusted contacts
 */
export const DEMO_CONTACTS = [
  {
    id: "demo-contact-1",
    name: "Mom",
    relation: "Family / Guardian",
    phone: "+91 90000 00001",
    status: "Active",
  },
  {
    id: "demo-contact-2",
    name: "Best Friend",
    relation: "Friend",
    phone: "+91 90000 00002",
    status: "Active",
  },
  {
    id: "demo-contact-3",
    name: "Emergency Contact",
    relation: "Guardian",
    phone: "+91 90000 00003",
    status: "Active",
  },
];

/**
 * Safety preference presets for quick mode selection
 */
export const SAFETY_PRESETS = {
  balanced: {
    name: "Balanced",
    description: "Default safety/efficiency balance",
    weights: {
      safety: 30,
      time: 20,
      facilities: 20,
      efficiency: 30,
    },
  },
  maximumSafety: {
    name: "Maximum Safety",
    description: "Prioritize safety above all",
    weights: {
      safety: 60,
      time: 10,
      facilities: 20,
      efficiency: 10,
    },
  },
  nightTravel: {
    name: "Night Travel",
    description: "Optimize for nighttime safety",
    weights: {
      safety: 50,
      time: 10,
      facilities: 30,
      efficiency: 10,
    },
  },
  emergency: {
    name: "Emergency",
    description: "Prioritize emergency facilities",
    weights: {
      safety: 40,
      time: 5,
      facilities: 50,
      efficiency: 5,
    },
  },
  fastest: {
    name: "Fastest Route",
    description: "Minimize travel time while maintaining safety",
    weights: {
      safety: 15,
      time: 30,
      facilities: 10,
      efficiency: 45,
    },
  },
  facilityPriority: {
    name: "Facility Priority",
    description: "Maximize access to support services",
    weights: {
      safety: 25,
      time: 15,
      facilities: 50,
      efficiency: 10,
    },
  },
};
