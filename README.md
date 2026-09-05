# 🛡️ SafeRoute

### Intelligent Safety-Aware Navigation

> **SafeRoute is a safety-first navigation platform that helps users compare routes using contextual safety signals instead of relying only on distance or travel time.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite\&logoColor=white)](https://vite.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet\&logoColor=white)](https://leafletjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?logo=firebase\&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase\&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

## 🚨 The Problem

Traditional navigation applications primarily optimize for:

* 📍 Distance
* ⏱️ Travel time
* 🚗 Traffic

However, the shortest or fastest route isn't necessarily the most suitable route for every situation.

A route may contain:

* poorly lit or isolated areas
* locations with repeated community reports
* limited access to emergency facilities
* different risk levels depending on time
* areas where users have reported incidents

SafeRoute explores how navigation can incorporate these contextual signals into route selection.

---

# 💡 Our Approach

Instead of simply asking:

> **"What is the fastest route?"**

SafeRoute asks:

> **"Which route provides the best balance between safety, accessibility, community confidence and efficiency?"**

The system generates route alternatives and evaluates them using multiple safety-related factors.

---

# ✨ Features

### 🗺️ Safety-Aware Route Comparison

Compare multiple route alternatives using a multi-factor scoring system.

Routes can be evaluated using:

* Environmental safety
* Community reliability
* Time context
* Emergency accessibility
* Route efficiency

---

### ⚖️ Personalized Safety Preferences

Users can adjust the relative importance of different safety factors.

Example:

```text
Environmental Safety       35%
Community Reliability      25%
Time Context               15%
Emergency Accessibility    15%
Efficiency                 10%
                           ────
                           100%
```

The weighting system dynamically maintains the overall distribution.

---

### 🤖 Community Report Confidence

Community reports are not automatically treated as equally reliable.

SafeRoute evaluates signals such as:

* Verification
* Credibility
* Recency
* Community agreement
* Originality
* Potential spam

These signals contribute to a confidence score.

---

### 📍 Route Segment Analysis

Instead of treating an entire route as one score, SafeRoute can analyze individual route segments.

This helps identify situations such as:

> "The overall route is reasonable, but one section has elevated risk."

---

### 🔥 Safety Zones

The interactive map provides visual safety information including:

* Safety zones
* Community reports
* Emergency facilities
* Route alternatives
* User location

---

### 🏥 Facility-Aware Routing

SafeRoute considers nearby facilities such as:

* Hospitals
* Police stations
* Pharmacies
* Clinics
* Support facilities

Facility proximity can contribute to route evaluation.

---

### 🌙 Time-Aware Safety

Context can change depending on when a route is being traveled.

SafeRoute incorporates time context such as:

* Day
* Night
* Late night

This allows route evaluations to adapt to temporal conditions.

---

### 👥 Community Verification

Community reports can contain signals including:

* Verification
* Upvotes
* Similar reports
* Geographic proximity

Related reports can be clustered to reduce duplication and improve data quality.

---

### 🚨 Emergency SOS

The application includes an emergency workflow with:

* SOS countdown
* Trusted contacts
* Location sharing
* Current route information
* Emergency communication workflow

---

### 🥷 Stealth Mode

A discreet interface mode designed for situations where the user may prefer a less attention-grabbing application experience.

---

### 📱 Responsive & PWA Ready

Designed to work across:

* Desktop
* Tablet
* Mobile

The project also includes service-worker registration for Progressive Web App functionality.

---

# 🧠 Route Scoring

At a high level:

```text
                   ROUTE
                     │
          ┌──────────┴──────────┐
          │                     │
     Route Data             Context Data
          │                     │
          │        ┌────────────┼────────────┐
          │        │            │            │
          ▼        ▼            ▼            ▼
      Distance   Reports    Facilities     Time
          │        │            │            │
          └────────┴────────────┴────────────┘
                           │
                           ▼
                  Safety Scoring Engine
                           │
                           ▼
                  Weighted Route Score
                           │
                           ▼
                  Route Comparison
```

The objective is to make route recommendations more context-aware and explainable.

---

# 🏗️ Architecture

```text
React Frontend
      │
      ├── Map & Route Interface
      │
      ├── Safety Preference Engine
      │
      ├── Community Reports
      │
      ├── Emergency / SOS
      │
      └── Safety Visualization
              │
              ▼
       Scoring & Analysis
              │
       ┌──────┼─────────┐
       ▼      ▼         ▼
    Routes  Reports  Facilities
       │      │         │
       └──────┼─────────┘
              ▼
        Route Evaluation
```

---

# 🛠️ Tech Stack

| Category     | Technology              |
| ------------ | ----------------------- |
| Frontend     | React 19                |
| Build Tool   | Vite                    |
| Styling      | Tailwind CSS            |
| Icons        | Lucide React            |
| Maps         | Leaflet / React Leaflet |
| Routing      | OSRM                    |
| Geocoding    | Photon                  |
| Backend/Data | Firebase                |
| Database     | Supabase                |
| PWA          | Service Worker          |
| Language     | JavaScript              |

---

# 📂 Project Structure

```text
src/
│
├── components/
│   ├── MapFilterPanel.jsx
│   ├── ReportDetailPanel.jsx
│   ├── RouteComparisonCard.jsx
│   ├── SafetyLegend.jsx
│   └── SafetyPreferencePanel.jsx
│
├── utils/
│   ├── demoData.js
│   ├── facilityScoring.js
│   ├── reportAnalysis.js
│   ├── routeScoring.js
│   └── sosDispatcher.js
│
├── firebase.js
├── supabaseClient.js
├── ErrorBoundary.jsx
├── swRegistration.js
└── main.jsx
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js
* npm
* Git

## Clone

```bash
git clone YOUR_REPOSITORY_URL
cd saferoute-frontend
```

## Install

```bash
npm install
```

## Environment Variables

Create a `.env` file locally.

Use `.env.example` as the template.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> Never commit your real `.env` file.

## Run

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

---

# 📸 Screenshots

Add screenshots here once your final UI captures are ready.

Recommended screenshots:

1. Main dashboard
2. Route comparison
3. Safety map
4. Community report analysis
5. Safety preferences
6. Emergency/SOS interface

Example:

```markdown
![SafeRoute Dashboard](./docs/screenshots/dashboard.png)
```

---

# 🎥 Demo

### ▶️ SafeRoute Product Demo

Add your demo video link here.

Recommended hosting:

**YouTube — Unlisted**

```markdown
[▶️ Watch SafeRoute Demo](YOUR_VIDEO_LINK)
```

---

# 🧪 Testing

The project contains documentation covering testing and verification of:

* Route planning
* Safety scoring
* Route comparison
* Safety preferences
* Map filtering
* Community reports
* Report confidence
* Trusted contacts
* SOS workflow
* Stealth mode
* Responsive UI

Relevant documentation:

```text
TESTING_GUIDE.md
VERIFICATION_CHECKLIST.md
INTEGRATION_STATUS.md
```

---

# 🔮 Future Roadmap

### Phase 1 — Prototype

* [x] Safety-aware route comparison
* [x] Community reports
* [x] Safety scoring
* [x] Facility-aware routing
* [x] Emergency workflow

### Phase 2 — Intelligence

* [ ] Machine-learning-based risk prediction
* [ ] Real-time incident feeds
* [ ] Advanced geospatial clustering
* [ ] Infrastructure-based risk modelling
* [ ] Explainable AI recommendations

### Phase 3 — Scale

* [ ] City-wide safety datasets
* [ ] Offline map support
* [ ] Real-time safety updates
* [ ] Advanced notification infrastructure
* [ ] Large-scale community verification

---

# ⚠️ Disclaimer

SafeRoute is a prototype/research project exploring safety-aware navigation.

Safety scores are algorithmic estimates and **do not guarantee personal safety**.

Users should always exercise independent judgment and follow official emergency guidance.

---

# 👨‍💻 Project

**SafeRoute**

An exploration of:

`Geospatial Computing` · `Route Optimization` · `Community Intelligence` · `Data Analysis` · `Emergency Accessibility` · `Frontend Engineering`

---

⭐ If you find the project interesting, consider starring the repository.
