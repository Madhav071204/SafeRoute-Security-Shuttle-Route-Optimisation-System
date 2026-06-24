# SafeRoute

A route optimization tool for university security shuttles. Built as a portfolio project demonstrating full-stack development, algorithm implementation, and modern web technologies.

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
- **Privacy-Focused**: No data persistence - addresses stored in browser session only
- **Demo Mode**: Pre-loaded fake addresses for portfolio demonstrations

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS |
| Maps | Mapbox GL JS |
| Geocoding | Mapbox Geocoding API |
| Routing | Mapbox Directions API |
| Algorithms | Custom nearest-neighbor heuristic |
| Deployment | Vercel |

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

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Mapbox API key (free tier available)

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

4. Add your Mapbox API token to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

Get a free Mapbox token at: https://account.mapbox.com/access-tokens/

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:3000 in your browser

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox API public token for maps and geocoding | Yes |

## Privacy Notice

SafeRoute does **not** store your trip data:
- Passenger addresses are held in browser memory only
- Addresses are cleared when you close the browser tab
- No addresses are saved to your device or our servers

However, addresses **are** sent to third-party services:
- Mapbox Geocoding API (to convert addresses to coordinates)
- Mapbox Directions API (to calculate driving routes)

These services have their own privacy policies. Do not enter addresses for real students in a production context.

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

Built by **Madhav** | Monash University Computer Science Student

[LinkedIn](https://linkedin.com/in/your-profile) | [GitHub](https://github.com/Madhav071204)
