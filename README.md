# SafeRoute

A route optimization tool for university security shuttles. Built as a portfolio project demonstrating full-stack development, algorithm implementation, and modern web technologies.

## CI

[![CI](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/workflows/ci.yml/badge.svg)](https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System/actions/workflows/ci.yml)

GitHub Actions runs linting, TypeScript typechecking, and a production build on:

- pushes to `main` (and `develop`)
- pull requests targeting `main`

See `docs/ci-cd.md` for details.

![SafeRoute Dashboard](./docs/demo.png)

## The Problem

University security shuttles typically drop students off in the order they boarded (FIFO - First In, First Out). This often results in:
- Inefficient routes with unnecessary backtracking
- Longer total trip times for all passengers
- Higher fuel consumption and operational costs

## The Solution

SafeRoute lets drivers enter up to 15 passenger addresses and calculates an optimized drop-off route using a nearest-neighbor heuristic. Drivers can compare the optimized route against FIFO ordering and see potential savings in distance, time, and fuel costs.

## Features

- **Address Input**: Enter up to 15 passenger drop-off addresses with automatic geocoding
- **Route Optimization**: Nearest-neighbor heuristic for efficient route planning
- **Visual Comparison**: Side-by-side FIFO vs optimized route metrics
- **Interactive Map**: Mapbox GL map with markers and route polylines
- **Driver Execution View**: Step-by-step navigation with progress tracking
- **Cost Estimation**: Fuel cost calculations based on configurable consumption rates
- **Local-Only Storage**: Trip, request, and settings data are stored in the browser's `localStorage` (no first-party server) — see [Privacy and Data Handling](#privacy-and-data-handling)
- **Demo Mode**: Pre-loaded fake addresses for portfolio demonstrations

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS |
| Maps | Mapbox GL JS |
| Geocoding | Mapbox Geocoding API |
| Routing | Mapbox Directions API |
| Algorithms | Custom nearest-neighbor heuristic |
| Deployment | AWS ECS Express Mode (see below) |

## Algorithm

SafeRoute uses a **nearest-neighbor heuristic** to optimize routes:

1. Start at the origin (university)
2. Find the unvisited stop closest to the current position
3. Travel to that stop and mark it as visited
4. Repeat until all stops have been visited

**Time Complexity**: O(n²) - fast for up to 15 stops

**Note**: This is a heuristic algorithm that finds good solutions quickly but does not guarantee the absolute optimal route. In practice, it typically reduces total distance by **15-35%** compared to FIFO ordering.

### Route Comparison Example

| Metric | FIFO | Optimized | Savings |
|--------|------|-----------|---------|
| Distance | 52.3 km | 41.2 km | 21% |
| Time | 78 min | 62 min | 21% |
| Fuel Cost | $11.28 | $8.89 | $2.39 |

## Screenshots

*Add screenshots here showing:*
- Dashboard with address input
- Map with optimized route
- Route comparison panel
- Driver execution view

## Live deployment

Production (AWS ECS Express Mode, `ap-southeast-2`):

https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws

Health: `/api/health` → `{"status":"ok"}`.  
OIDC CD: push to `chore/release-baseline` runs validate → Playwright → deploy (see `docs/ci-cd.md`).  
Evidence: `docs/aws-first-deployment.md`, `docs/production-acceptance.md`.

## Getting Started

### Prerequisites

- Node.js 22 (see `.nvmrc` / `.node-version` and `package.json` engines)
- npm
- Mapbox API token (free tier available; public + optional server token)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Madhav071204/SafeRoute-Security-Shuttle-Route-Optimisation-System.git
cd SafeRoute-Security-Shuttle-Route-Optimisation-System
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add Mapbox tokens to `.env.local` (see `.env.example` for roles):
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token_here
MAPBOX_ACCESS_TOKEN=your_mapbox_server_token_here
```
The public token is embedded in the browser bundle at build time. The server
token is used by API routes and must never use a `NEXT_PUBLIC_` prefix.

Get tokens at: https://account.mapbox.com/access-tokens/

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:3000 in your browser

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public Mapbox token for browser Mapbox GL (build-time client bundle) | Yes for maps |
| `MAPBOX_ACCESS_TOKEN` | Server-only Mapbox token for geocoding/routing/directions API routes | Recommended in production |

## Privacy and Data Handling

SafeRoute is a personal proof-of-concept. It is **not** intended for sensitive or real passenger operations in its current state.

### Data stored locally in your browser

Some application data is stored in your browser's `localStorage`:

- **Trip history** (`saferoute_trips`) — including stops with passenger names, drop-off addresses, and coordinates.
- **Active dispatch trip** (`saferoute_dispatch`) — including the driver's last known location coordinates while a trip is running.
- **Ride requests** (`saferoute_ride_requests`) — including passenger names, optional contact details, and pickup/destination addresses and coordinates.
- **App settings** (`saferoute_settings`) — such as fuel cost values and the default origin address.

This locally stored data:

- **May remain after you close the tab or browser** — it is not session-only.
- Stays on the same browser and device until it is cleared by the application, overwritten, or removed through your browser's storage controls.
- Has no automatic expiry (trip history is only capped at the 500 most recent trips).
- Is stored as plain text and is **not** encrypted.
- Is local to your device only — it is not synced to any first-party server. Storing data in `localStorage` is **not** equivalent to server-side database storage.

**Clearing data:** the Settings page can reset app settings, and the Dispatcher view can clear the active dispatch trip. There is currently no in-app control to clear saved trip history or ride requests — use your browser's site-data/storage controls to remove them.

### Third-party processing (Mapbox)

Addresses and location coordinates are sent to Mapbox to perform the app's core functions:

- Mapbox Geocoding / Search APIs (to convert addresses to coordinates)
- Mapbox Directions API (to calculate driving routes)

Mapbox processes this data under its own terms and privacy policy. This project makes no claim about how Mapbox stores, retains, or deletes that data.

### Recommendations

- Do not enter real passenger addresses in this proof-of-concept.
- Avoid retaining precise passenger addresses or driver location longer than necessary; clear stored data when you are finished.

## Disclaimer

This is a **student portfolio project** and proof-of-concept only. SafeRoute is not affiliated with Monash University or its security services. Do not use this application for actual student transport operations.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (geocoding, optimization, routing)
│   ├── settings/          # Settings page
│   └── about/             # About page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── trip/             # Trip input components
│   ├── map/              # Map visualization
│   ├── results/          # Route comparison
│   └── execution/        # Driver execution view
├── lib/                   # Core logic
│   ├── algorithms/       # Haversine, nearest-neighbor
│   └── mapbox.ts         # Mapbox API client
├── context/              # React context providers
├── hooks/                # Custom React hooks
├── types/                # TypeScript interfaces
└── data/                 # Demo data
```

## Future Improvements

- [ ] 2-opt algorithm for improved optimization
- [ ] User authentication (driver login)
- [ ] Trip history and saved trips
- [ ] Export route as PDF
- [ ] Drag-and-drop stop reordering
- [ ] Real-time traffic consideration
- [ ] Multi-vehicle support
- [ ] Dark mode

## Contributing

This is a portfolio project, but suggestions and feedback are welcome! Feel free to open an issue.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built by **Ekachit** | Monash University Computer Science Student

[LinkedIn](https://linkedin.com/in/your-profile) | [GitHub](https://github.com/Madhav071204)
