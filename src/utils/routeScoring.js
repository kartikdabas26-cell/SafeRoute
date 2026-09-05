/**
 * routeScoring.js
 * Advanced weighted route safety scoring system
 * Supports interconnected safety preferences (Safety, Time, Facilities, Efficiency)
 */

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Calculate Haversine distance in meters between two points
 * @param {[number, number]} a - [lat, lng]
 * @param {[number, number]} b - [lat, lng]
 * @returns {number} Distance in meters
 */
export function haversineMeters(a, b) {
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

/**
 * Find minimum distance from a point to any point on a route (sampled for performance)
 * @param {Array<[number, number]>} routeCoords - Route coordinates
 * @param {[number, number]} point - Point to check
 * @returns {number} Minimum distance in meters
 */
export function minDistanceToRoute(routeCoords, point) {
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
 * Calculate environmental safety component (lighting, hazards, etc.)
 * Based on nearby reports and their confidence
 */
function calculateEnvironmentalSafety(route, reports) {
  let score = 85; // baseline

  const relevantReports = reports
    .filter((report) => report.coords)
    .map((report) => ({
      report,
      distance: minDistanceToRoute(route.coordinates, report.coords),
    }))
    .filter(({ distance }) => distance <= 500) // expanded radius
    .sort((a, b) => a.distance - b.distance);

  relevantReports.forEach(({ report, distance }) => {
    const proximityFactor = 1 - distance / 500;
    const confidence = report.ai_confidence || (report.verified ? 0.9 : 0.5);
    const baseImpact = {
      "Lighting Failure": -18,
      "Safety Hazard": -15,
      "Suspicious Activity": -12,
      "Harassment Concern": -14,
      "Police Presence": 0, // neutral
      "Police Patrol": 2, // slight positive
      "Theft Concern": -16,
      "Accident": -20,
      "Infrastructure Issue": -10,
      "Unsafe Environment": -18,
      "Positive Safety Observation": 8,
    };

    const impact = (baseImpact[report.category] || -10) * proximityFactor * confidence;
    score += impact;
  });

  return clamp(Math.round(score), 30, 95);
}

/**
 * Calculate community reliability component
 * Based on report density and quality
 */
function calculateCommunityReliability(route, reports) {
  let score = 80;

  const relevantReports = reports
    .filter((report) => report.coords)
    .filter(
      (report) =>
        minDistanceToRoute(route.coordinates, report.coords) <= 500
    );

  const credibleReports = relevantReports.filter(
    (r) => (r.ai_confidence || 0) >= 70
  );

  const reportDensity = relevantReports.length;
  const credibilityRatio =
    reportDensity > 0 ? credibleReports.length / reportDensity : 1;

  score -= Math.min(20, reportDensity * 2); // density penalty
  score += credibilityRatio * 15; // credibility bonus

  return clamp(Math.round(score), 30, 95);
}

/**
 * Calculate time-based safety component
 * Considers current time and nighttime exposure
 */
function calculateTimeContext(route) {
  const now = new Date();
  const hour = now.getHours();
  const durationMinutes = route.durationSeconds / 60;

  let score = 75;

  // Time of day adjustments
  if (hour >= 22 || hour < 5) {
    score -= 20; // late night
  } else if (hour >= 20 || hour < 7) {
    score -= 10; // evening/early morning
  } else if (hour >= 18 || hour < 8) {
    score -= 5; // early evening/late morning
  }

  // Duration during risky hours
  if ((hour >= 20 || hour < 6) && durationMinutes > 30) {
    score -= Math.min(10, durationMinutes / 10); // longer trips at night
  }

  return clamp(Math.round(score), 30, 95);
}

/**
 * Calculate emergency accessibility component
 * Based on nearby hospitals, police stations, etc.
 */
function calculateEmergencyAccessibility(route, facilities) {
  let score = 65;

  const proximitityTiers = {
    police: { 300: 12, 700: 8, 1500: 3 },
    hospital: { 300: 15, 700: 10, 1500: 4 },
    pharmacy: { 500: 8, 1000: 4 },
    help_point: { 400: 10, 900: 5 },
  };

  facilities.forEach((facility) => {
    const distance = minDistanceToRoute(route.coordinates, facility.coords);
    const tiers = proximitityTiers[facility.category?.toLowerCase()] || { 1500: 2 };

    for (const [threshold, points] of Object.entries(tiers)) {
      if (distance <= Number(threshold)) {
        score += points * (facility.verified ? 1 : 0.7);
        break;
      }
    }
  });

  return clamp(Math.round(score), 30, 95);
}

/**
 * Calculate route efficiency component
 * Based on distance and travel time
 */
function calculateEfficiency(route) {
  let score = 80;

  const distanceKm = route.distanceMeters / 1000;
  const durationMin = route.durationSeconds / 60;
  const fastestDistance = route.comparison?.fastestDistanceMeters || route.distanceMeters;
  const fastestDuration = route.comparison?.fastestDurationSeconds || route.durationSeconds;

  const distanceRatio = distanceKm / (fastestDistance / 1000);
  const durationRatio = durationMin / (fastestDuration / 60);
  score -= Math.min(18, Math.max(0, (distanceRatio - 1) * 45));
  score -= Math.min(18, Math.max(0, (durationRatio - 1) * 30));

  // Shorter routes are slightly safer (less exposure)
  if (distanceKm < 3) {
    score += 8;
  } else if (distanceKm < 5) {
    score += 4;
  } else if (distanceKm > 15) {
    score -= 8;
  } else if (distanceKm > 10) {
    score -= 4;
  }

  // Reasonable duration expectations
  const estimatedWalkingTime = distanceKm * 15; // 4 km/h walking
  if (durationMin > estimatedWalkingTime * 1.3) {
    score -= 5; // suspiciously long routes
  }

  return clamp(Math.round(score), 30, 95);
}

/**
 * Main route scoring function with weighted components
 * @param {Object} route - Route object from OSRM
 * @param {Array} reports - Community reports
 * @param {Array} facilities - Support facilities
 * @param {Object} weights - { safety, time, facilities, efficiency } (sums to 1.0)
 * @returns {Object} Scored route with detailed breakdown
 */
export function scoreRoute(route, reports, facilities, weights = {}) {
  // Default balanced weights
  const finalWeights = {
    environmental: weights.safety || 0.25,
    community: weights.safety || 0.25,
    time: weights.time || 0.2,
    emergency: weights.facilities || 0.2,
    efficiency: weights.efficiency || 0.1,
  };

  // Normalize weights to sum to 1
  const total = Object.values(finalWeights).reduce((a, b) => a + b, 0);
  Object.keys(finalWeights).forEach((key) => {
    finalWeights[key] /= total;
  });

  // Calculate components
  const components = {
    environmental: calculateEnvironmentalSafety(route, reports),
    community: calculateCommunityReliability(route, reports),
    time: calculateTimeContext(route),
    emergency: calculateEmergencyAccessibility(route, facilities),
    efficiency: calculateEfficiency(route),
  };

  // Calculate weighted final score
  const finalScore = Math.round(
    Object.entries(finalWeights).reduce((sum, [key, weight]) => {
      return sum + components[key] * weight;
    }, 0)
  );

  const riskLabel = getRiskLabel(finalScore);

  // Generate explanation
  const explanation = generateExplanation(
    route,
    reports,
    facilities,
    components
  );

  return {
    ...route,
    score: finalScore,
    riskLabel: riskLabel.label,
    riskTone: riskLabel.tone,
    components,
    weights: finalWeights,
    explanation,
  };
}

/**
 * Get risk label and tone based on score
 */
export function getRiskLabel(score) {
  if (score >= 80) return { label: "Lower concern", tone: "good" };
  if (score >= 65) return { label: "Moderate concern", tone: "warn" };
  if (score >= 45) return { label: "Higher caution", tone: "danger" };
  return { label: "Severe caution", tone: "danger" };
}

/**
 * Generate human-readable explanation for route score
 */
function generateExplanation(route, reports, facilities, components) {
  const parts = [];

  // Environmental findings
  if (components.environmental >= 80) {
    parts.push("✓ Strong environmental safety signals");
  } else if (components.environmental >= 65) {
    parts.push("~ Mixed environmental conditions");
  } else {
    parts.push("⚠ Environmental concerns detected");
  }

  // Report analysis
  const nearbyReports = reports.filter(
    (r) => r.coords && minDistanceToRoute(route.coordinates, r.coords) <= 500
  );
  if (nearbyReports.length > 0) {
    parts.push(`${nearbyReports.length} report(s) within route vicinity`);
  }

  // Facility analysis
  const nearbyFacilities = facilities.filter(
    (f) => minDistanceToRoute(route.coordinates, f.coords) <= 1000
  );
  if (nearbyFacilities.length > 0) {
    parts.push(`${nearbyFacilities.length} support facility/facilities nearby`);
  } else {
    parts.push("Limited emergency support availability");
  }

  // Time context
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 22 || hour < 5) {
    parts.push("Late-night routing increases caution factors");
  } else if (hour >= 20 || hour < 7) {
    parts.push("Evening/early morning: moderately increased caution");
  }

  return parts;
}

/**
 * Score a route segment (divide route into equal parts and score each)
 * Returns array of segment scores
 */
export function scoreRouteSegments(route, reports, facilities, numSegments = 5) {
  const segmentLength = Math.ceil(route.coordinates.length / numSegments);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const start = i * segmentLength;
    const end = Math.min((i + 1) * segmentLength, route.coordinates.length);
    const segmentCoords = route.coordinates.slice(start, end);

    if (segmentCoords.length === 0) continue;

    // Calculate segment safety
    let segmentScore = 75;

    // Check reports in this segment
    segmentCoords.forEach((coord) => {
      reports.forEach((report) => {
        if (!report.coords) return;
        const distance = haversineMeters(coord, report.coords);
        if (distance < 300) {
          const impact = (report.ai_confidence || 0.5) * -10;
          segmentScore += impact;
        }
      });
    });

    // Check facilities near segment
    facilities.forEach((facility) => {
      segmentCoords.forEach((coord) => {
        const distance = haversineMeters(coord, facility.coords);
        if (distance < 400) {
          segmentScore += 5;
        }
      });
    });

    segments.push({
      index: i,
      score: clamp(Math.round(segmentScore), 30, 95),
      startCoord: segmentCoords[0],
      endCoord: segmentCoords[segmentCoords.length - 1],
      coordinates: segmentCoords,
    });
  }

  return segments;
}

/**
 * Generate safety zones (heatmap-like areas) from reports and facilities
 * Returns array of zone objects with center, radius, and safety score
 */
export function generateSafetyZones(reports, facilities) {
  const zones = [];

  // Create zones around report clusters
  const reportClusters = clusterPoints(
    reports.filter((r) => r.coords),
    200 // 200m radius for clustering
  );

  reportClusters.forEach((cluster) => {
    const avgLat =
      cluster.points.reduce((sum, p) => sum + p.coords[0], 0) / cluster.points.length;
    const avgLng =
      cluster.points.reduce((sum, p) => sum + p.coords[1], 0) / cluster.points.length;

    const safetyScore = Math.max(
      35,
      100 - cluster.points.length * 8 - (avgConfidence(cluster.points) > 70 ? 20 : 0)
    );

    zones.push({
      id: `zone-report-${cluster.id}`,
      type: "report",
      center: [avgLat, avgLng],
      radius: Math.min(500, cluster.points.length * 100),
      score: safetyScore,
      count: cluster.points.length,
      confidence: avgConfidence(cluster.points),
    });
  });

  // Create positive zones around facilities
  facilities.forEach((facility) => {
    zones.push({
      id: `zone-facility-${facility.id}`,
      type: "facility",
      center: facility.coords,
      radius: 600,
      score: 85,
      category: facility.category,
    });
  });

  return zones;
}

/**
 * Simple clustering algorithm
 */
function clusterPoints(points, radius) {
  const clusters = [];
  const visited = new Set();

  points.forEach((point, idx) => {
    if (visited.has(idx)) return;

    const cluster = {
      id: clusters.length,
      points: [point],
    };
    visited.add(idx);

    points.forEach((otherPoint, otherIdx) => {
      if (visited.has(otherIdx)) return;
      if (haversineMeters(point.coords, otherPoint.coords) < radius) {
        cluster.points.push(otherPoint);
        visited.add(otherIdx);
      }
    });

    clusters.push(cluster);
  });

  return clusters;
}

function avgConfidence(points) {
  if (points.length === 0) return 0;
  return (
    points.reduce((sum, p) => sum + (p.ai_confidence || 0.5), 0) / points.length
  );
}
