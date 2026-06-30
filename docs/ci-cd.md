# CI/CD (GitHub Actions)

This project uses **GitHub Actions** to run a basic, professional CI pipeline on every change to `main` (and `develop`, if used).

## What runs in CI

The workflow lives at `.github/workflows/ci.yml` and runs on:

- pushes to `main`
- pushes to `develop`
- pull requests targeting `main`

CI steps:

- **Install**: installs dependencies using `npm ci` (because `package-lock.json` is present)
- **Lint**: runs `npm run lint`
- **Typecheck**: runs `npm run typecheck` (`tsc --noEmit`)
- **Build**: runs `npm run build` (`next build`)

If any of these steps fails, the workflow fails.

## Node.js version

CI uses **Node.js 20 (LTS)**. The README states Node 18+ is required; Node 20 satisfies that while being the current LTS on GitHub Actions.

## Secrets / environment variables

### Required for CI build

None by default.

### Required to use the app

- `NEXT_PUBLIC_MAPBOX_TOKEN`: required at runtime for Mapbox map display, address search, geocoding, and routing.

If you later add automated tests that exercise Mapbox features, add a GitHub Actions Secret:

- `NEXT_PUBLIC_MAPBOX_TOKEN`

and wire it into the workflow with:

```yaml
env:
  NEXT_PUBLIC_MAPBOX_TOKEN: ${{ secrets.NEXT_PUBLIC_MAPBOX_TOKEN }}
```

## Run the same checks locally

From the repo root:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

