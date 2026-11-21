# Frontend — Ops Desk

A React + Vite single-page app that provides the UI for three operations automation tools:

| Tab | What it does |
|---|---|
| **Parcel images** | Upload warehouse parcel photos; view extracted AWB, weight, dimensions, and any flags |
| **Wagesheet vs ECR** | Upload a wagesheet + PF/ESIC ECR PDFs; get a colour-coded compliance report |
| **FC P&L monitor** | Upload daily FC cost data; browse the P&L dashboard and anomaly feed |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 or later |
| npm | bundled with Node |

The backend must be running on `http://localhost:8000` (default). See [`../backend/README.md`](../backend/README.md).

---

## Setup

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies (only needed once, or after package.json changes)
npm install
```

---

## Start (development)

```bash
npm run dev
```

The dev server starts at **http://localhost:5173** with hot-module reload.  
Open that URL in your browser — changes to source files are reflected instantly without a full refresh.

---

## Other scripts

| Command | What it does |
|---|---|
| `npm run build` | Bundle for production into `dist/` |
| `npm run preview` | Serve the production build locally (after `build`) |
| `npm run lint` | Run ESLint across all source files |

---

## Project layout

```
frontend/
├── public/          # Static assets (favicon, icons)
├── src/
│   ├── main.jsx             # Entry point – mounts <App> into the DOM
│   ├── App.jsx              # Router + tab shell (side-nav with three tabs)
│   ├── Case1Parcels.jsx     # Tab 1 – parcel image uploader & results table
│   ├── Case2Compliance.jsx  # Tab 2 – wagesheet compliance checker
│   ├── Case3PnL.jsx         # Tab 3 – FC P&L dashboard & anomaly feed
│   ├── ui.jsx               # Shared UI primitives (buttons, cards, etc.)
│   ├── App.css              # Shell & nav styles
│   └── index.css            # Global resets
├── package.json
└── vite.config.js
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Tab navigation via URL (`/case1`, `/case2`, `/case3`) |
| `vite` | Dev server & bundler |
| `eslint` | Linting |
