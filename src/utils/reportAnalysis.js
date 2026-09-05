/**
 * reportAnalysis.js
 * AI-assisted community report analysis system
 * Includes confidence scoring, spam detection, and duplicate identification
 */

/**
 * Analyze community report quality and generate confidence score
 * @param {Object} report - Report object to analyze
 * @param {Array} allReports - All reports for context
 * @returns {Object} Analysis with confidence and component scores
 */
export function analyzeReportQuality(report, allReports = []) {
  const analysis = {
    originality: calculateOriginality(report, allReports),
    credibility: calculateCredibility(report),
    verification: report.verified ? 95 : 40,
    recency: calculateRecency(report),
    communityAgreement: calculateCommunityAgreement(report, allReports),
    spamProbability: calculateSpamProbability(report, allReports),
  };

  // Calculate final confidence (weighted average)
  const finalConfidence = Math.round(
    analysis.originality * 0.15 +
      analysis.credibility * 0.25 +
      analysis.verification * 0.20 +
      analysis.recency * 0.15 +
      analysis.communityAgreement * 0.15 +
      (100 - analysis.spamProbability) * 0.10
  );

  return {
    ...analysis,
    confidence: Math.max(10, Math.min(95, finalConfidence)), // Clamp to 10-95 range
    trustLevel: getTrustLevel(finalConfidence),
  };
}

/**
 * Calculate originality score (0-100)
 * Looks at how unique this report is
 */
function calculateOriginality(report, allReports) {
  const similarReports = findSimilarReports(report, allReports);
  
  if (similarReports.length === 0) {
    return 95; // Highly original
  }

  if (similarReports.length <= 2) {
    return 75; // Some similar reports
  }

  if (similarReports.length <= 5) {
    return 55; // Multiple similar reports
  }

  return 30; // Many duplicates
}

/**
 * Calculate credibility score (0-100)
 * Based on description quality, category, etc.
 */
function calculateCredibility(report) {
  let score = 60;

  // Description quality
  const titleLength = (report.title || "").length;
  if (titleLength < 10) {
    score -= 20; // Too short
  } else if (titleLength < 30) {
    score -= 10; // Brief
  } else if (titleLength > 300) {
    score -= 10; // Suspiciously long
  } else {
    score += 10; // Good length
  }

  // Description detail
  if (report.description && report.description.length > 50) {
    score += 15; // Good detail
  }

  // Category validation
  const validCategories = [
    "Lighting",
    "Suspicious Activity",
    "Road Hazard",
    "Harassment Concern",
    "Medical Incident",
    "Police Presence",
    "Theft Concern",
    "Accident",
    "Infrastructure Issue",
    "Unsafe Environment",
    "Positive Safety Observation",
  ];

  if (!validCategories.some((cat) => report.category?.includes(cat))) {
    score -= 15; // Invalid category
  }

  // Has location data
  if (report.coords && Array.isArray(report.coords) && report.coords.length === 2) {
    score += 10;
  } else {
    score -= 20;
  }

  return Math.max(20, Math.min(90, score));
}

/**
 * Calculate recency score (0-100)
 * Newer reports are more relevant
 */
function calculateRecency(report) {
  const reportTime = new Date(report.created_at || report.time || Date.now());
  const now = new Date();
  const ageMinutes = (now - reportTime) / (1000 * 60);

  if (ageMinutes < 15) return 95; // Very recent
  if (ageMinutes < 60) return 85; // Recent
  if (ageMinutes < 240) return 70; // Today
  if (ageMinutes < 1440) return 50; // Past day
  if (ageMinutes < 10080) return 30; // Past week
  return 15; // Older
}

/**
 * Calculate community agreement score (0-100)
 * Based on upvotes and similar reports
 */
function calculateCommunityAgreement(report, allReports) {
  const upvotes = Number(report.upvotes || 0);
  const similarReports = findSimilarReports(report, allReports);

  let score = Math.min(60, upvotes * 5); // Base on upvotes

  if (similarReports.length > 0) {
    score += Math.min(40, similarReports.length * 8); // Bonus for confirmations
  }

  return Math.min(95, score);
}

/**
 * Calculate spam probability (0-100)
 * Higher = more likely to be spam
 */
function calculateSpamProbability(report, allReports) {
  let spamScore = 0;

  // Suspicious patterns
  const title = (report.title || "").toLowerCase();

  // Generic spam keywords
  const spamKeywords = [
    "click",
    "buy",
    "free",
    "win",
    "prize",
    "sex",
    "viagra",
    "casino",
  ];
  if (spamKeywords.some((kw) => title.includes(kw))) {
    spamScore += 35;
  }

  // Multiple identical/near-identical reports from same user
  const sameUserReports = allReports.filter(
    (r) => r.user_id === report.user_id
  );
  const similarFromUser = sameUserReports.filter((r) =>
    areReportsSimilar(report, r)
  );
  if (similarFromUser.length > 2) {
    spamScore += 40;
  }

  // Sudden burst of identical reports (coordinated spam)
  const recentSimilar = allReports.filter((r) => {
    const rTime = new Date(r.created_at || Date.now());
    const reportTime = new Date(report.created_at || Date.now());
    const diffMinutes = Math.abs(rTime - reportTime) / (1000 * 60);
    return diffMinutes < 5 && areReportsSimilar(report, r);
  });
  if (recentSimilar.length > 3) {
    spamScore += 35;
  }

  // Highly suspicious location changes in short time
  if (
    report.user_id &&
    sameUserReports.length > 1 &&
    sameUserReports.some((r) => {
      if (!report.coords || !r.coords) return false;
      const dist = haversineMeters(report.coords, r.coords);
      const timeDiff = Math.abs(
        new Date(report.created_at || Date.now()) -
          new Date(r.created_at || Date.now())
      );
      return dist > 50000 && timeDiff < 300000; // 50km in 5 min = suspicious
    })
  ) {
    spamScore += 25;
  }

  return Math.min(95, spamScore);
}

/**
 * Find similar reports (for duplicate detection)
 */
function findSimilarReports(report, allReports) {
  return allReports.filter(
    (r) =>
      r.id !== report.id && areReportsSimilar(report, r)
  );
}

/**
 * Check if two reports are similar (same location/category/description)
 */
function areReportsSimilar(report1, report2) {
  // Same category and location
  if (
    report1.category === report2.category &&
    report1.coords &&
    report2.coords
  ) {
    const distance = haversineMeters(report1.coords, report2.coords);
    if (distance < 200) return true; // Same general location
  }

  // Similar description
  const title1 = (report1.title || "").toLowerCase();
  const title2 = (report2.title || "").toLowerCase();

  if (title1 === title2) return true; // Identical

  // Levenshtein distance for fuzzy matching
  if (getLevenshteinDistance(title1, title2) < 5) {
    return true; // Very similar text
  }

  return false;
}

/**
 * Simple Levenshtein distance for string similarity
 */
function getLevenshteinDistance(a, b) {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get trust level label from confidence score
 */
export function getTrustLevel(confidence) {
  if (confidence >= 85) return "HIGH CONFIDENCE";
  if (confidence >= 70) return "COMMUNITY CONFIRMED";
  if (confidence >= 50) return "UNVERIFIED";
  return "LOW CONFIDENCE";
}

/**
 * Cluster similar reports together
 * Returns grouped reports with aggregate info
 */
export function clusterSimilarReports(reports) {
  const clusters = [];
  const processedIds = new Set();

  reports.forEach((report) => {
    if (processedIds.has(report.id)) return;

    const cluster = {
      id: `cluster-${clusters.length}`,
      category: report.category,
      location: report.location || "Unknown",
      center: report.coords,
      reports: [report],
      firstReported: report.created_at || new Date(),
      lastConfirmed: report.created_at || new Date(),
      totalConfidence: analyzeReportQuality(report, reports).confidence,
      count: 1,
    };

    processedIds.add(report.id);

    // Find similar reports
    reports.forEach((otherReport) => {
      if (processedIds.has(otherReport.id)) return;

      if (areReportsSimilar(report, otherReport)) {
        cluster.reports.push(otherReport);
        processedIds.add(otherReport.id);
        cluster.count += 1;

        // Update timing and confidence
        const otherTime = new Date(otherReport.created_at || new Date());
        if (otherTime > new Date(cluster.lastConfirmed)) {
          cluster.lastConfirmed = otherReport.created_at;
        }

        const otherConfidence = analyzeReportQuality(otherReport, reports).confidence;
        cluster.totalConfidence =
          (cluster.totalConfidence * (cluster.count - 1) + otherConfidence) /
          cluster.count;
      }
    });

    clusters.push(cluster);
  });

  return clusters;
}

/**
 * Auto-categorize a report based on its text content
 */
export function autoCategorizeReport(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  const categories = {
    Lighting: ["light", "dark", "broken", "streetlight", "lamp", "illumination"],
    "Suspicious Activity": [
      "suspicious",
      "strange",
      "unusual",
      "stranger",
      "loitering",
      "following",
    ],
    "Road Hazard": [
      "pothole",
      "broken",
      "debris",
      "rubble",
      "obstacle",
      "hazard",
      "road",
    ],
    "Harassment Concern": [
      "harassment",
      "unsafe",
      "threatening",
      "aggressive",
      "rude",
      "danger",
    ],
    "Medical Incident": ["medical", "accident", "injury", "hurt", "ambulance"],
    "Police Presence": ["police", "patrol", "officer", "checkpoint", "cop"],
    "Theft Concern": ["theft", "robbery", "stolen", "steal", "pickpocket"],
    Accident: ["accident", "crash", "collision", "hit", "injured"],
    "Infrastructure Issue": [
      "broken",
      "damaged",
      "water",
      "pipe",
      "construction",
      "maintenance",
    ],
    "Unsafe Environment": ["unsafe", "dangerous", "risk", "risky", "concern"],
    "Positive Safety Observation": [
      "good",
      "safe",
      "well",
      "patrol",
      "secure",
      "security",
    ],
  };

  let bestCategory = "Unsafe Environment"; // Default
  let bestScore = 0;

  Object.entries(categories).forEach(([category, keywords]) => {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  return bestCategory;
}

/**
 * Haversine distance helper (copied from routeScoring)
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
