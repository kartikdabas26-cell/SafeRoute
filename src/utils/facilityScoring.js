/**
 * facilityScoring.js
 * Facility identification, categorization, and impact on route safety
 */

export const FACILITY_CATEGORIES = {
  POLICE: "Police",
  HOSPITAL: "Hospital",
  PHARMACY: "Pharmacy",
  WASHROOM: "Washroom",
  HELP_POINT: "Help Point",
  SUPPORT_CENTER: "Support Center",
  CLINIC: "Clinic",
};

/**
 * Normalize facility data to consistent format
 */
export function normalizeFacility(facility) {
  return {
    id: facility.id || `fac-${Date.now()}-${Math.random()}`,
    name: facility.name || "Unknown Facility",
    category: facility.category || FACILITY_CATEGORIES.SUPPORT_CENTER,
    coords: facility.coords || [0, 0],
    address: facility.address || "",
    verified: Boolean(facility.verified),
    accessible: Boolean(facility.accessible),
    operatingHours: facility.operatingHours || "24/7",
    phone: facility.phone || "",
    source: facility.source || "Demo",
  };
}

/**
 * Get icon and color for facility category
 */
export function getFacilityStyle(category) {
  const styles = {
    [FACILITY_CATEGORIES.POLICE]: {
      color: "#0284c7",
      icon: "Shield",
      priority: 10,
    },
    [FACILITY_CATEGORIES.HOSPITAL]: {
      color: "#dc2626",
      icon: "Hospital",
      priority: 9,
    },
    [FACILITY_CATEGORIES.CLINIC]: {
      color: "#e11d48",
      icon: "Hospital",
      priority: 8,
    },
    [FACILITY_CATEGORIES.PHARMACY]: {
      color: "#059669",
      icon: "Pill",
      priority: 6,
    },
    [FACILITY_CATEGORIES.HELP_POINT]: {
      color: "#f59e0b",
      icon: "AlertCircle",
      priority: 9,
    },
    [FACILITY_CATEGORIES.SUPPORT_CENTER]: {
      color: "#8b5cf6",
      icon: "Users",
      priority: 7,
    },
    [FACILITY_CATEGORIES.WASHROOM]: {
      color: "#14b8a6",
      icon: "Droplet",
      priority: 3,
    },
  };

  return styles[category] || { color: "#6b7280", icon: "MapPin", priority: 5 };
}

/**
 * Calculate facility proximity benefit for a route
 * Uses proximity decay: closer facilities = higher benefit
 */
export function calculateFacilityBenefit(
  facility,
  routeCoords,
  maxDistance = 1500
) {
  const minDistance = minDistanceToRoute(routeCoords, facility.coords);

  if (minDistance > maxDistance) return 0;

  const style = getFacilityStyle(facility.category);
  const baseBenefit = style.priority;

  // Proximity decay: closer = more benefit
  const proximityFactor = 1 - minDistance / maxDistance;

  let benefit = baseBenefit * proximityFactor;

  // Verified facilities are more valuable
  if (facility.verified) {
    benefit *= 1.2;
  }

  // Accessibility matters
  if (facility.accessible) {
    benefit *= 1.1;
  }

  return benefit;
}

/**
 * Find all facilities near a location within a radius
 */
export function findNearbyFacilities(
  location,
  facilities,
  radiusMeters = 1000,
  categoryFilter = null
) {
  return facilities
    .filter(
      (facility) =>
        haversineMeters(location, facility.coords) <= radiusMeters &&
        (!categoryFilter || facility.category === categoryFilter)
    )
    .map((facility) => ({
      ...facility,
      distance: haversineMeters(location, facility.coords),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Get facility coverage summary for a route
 */
export function getFacilityCoverageSummary(route, facilities) {
  const coverage = {};

  Object.values(FACILITY_CATEGORIES).forEach((category) => {
    const nearby = facilities.filter(
      (f) =>
        f.category === category &&
        minDistanceToRoute(route.coordinates, f.coords) <= 1000
    );
    coverage[category] = nearby.length;
  });

  return coverage;
}

/**
 * Suggest alternative routes based on facility priorities
 * If user wants emergency/hospital prioritized, suggest routes near hospitals
 */
export function suggestFacilityPrioritizedRoute(
  routes,
  facilities,
  priorityCategory
) {
  return routes
    .map((route) => ({
      route,
      facilityScore: calculateCategoryProximity(
        route,
        facilities,
        priorityCategory
      ),
    }))
    .sort((a, b) => b.facilityScore - a.facilityScore)[0]?.route;
}

function calculateCategoryProximity(route, facilities, category) {
  const matchingFacilities = facilities.filter(
    (f) => f.category === category
  );

  if (matchingFacilities.length === 0) return 0;

  return matchingFacilities
    .map((facility) => calculateFacilityBenefit(facility, route.coordinates))
    .reduce((a, b) => a + b, 0);
}

/**
 * Helper: minimum distance from point to route (sampled)
 */
function minDistanceToRoute(routeCoords, point) {
  const step = Math.max(1, Math.floor(routeCoords.length / 250));
  let min = Infinity;

  for (let i = 0; i < routeCoords.length; i += step) {
    min = Math.min(min, haversineMeters(routeCoords[i], point));
  }

  if (routeCoords.length) {
    min = Math.min(
      min,
      haversineMeters(routeCoords[routeCoords.length - 1], point)
    );
  }

  return min;
}

/**
 * Helper: Haversine distance
 */
function haversineMeters(a, b) {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
