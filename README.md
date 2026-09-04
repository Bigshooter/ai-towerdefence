# AI Tower Defence

A browser-based tower defense game built with TypeScript, Vite, and HTML5 Canvas.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

Check your install:

```powershell
node -v
npm -v
```

## Install

From the project root:

```powershell
npm install
```

## Run In Development

Start the Vite dev server:

```powershell
npm run dev
```

Then open the URL shown in your terminal (typically `http://localhost:5173`).

## Build For Production

Create a production build:

```powershell
npm run build
```

Build output is generated in the `dist/` folder.

## Preview Production Build

After building, run:

```powershell
npm run preview
```

## Deploy To GitHub Pages

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds and deploys the game whenever changes are pushed to `main`.

For the first deployment, open the repository's **Settings > Pages** and set **Source** to **GitHub Actions**. After the workflow completes, the game is available at:

https://bigshooter.github.io/ai-towerdefence/

## Automated UI Testing

The project uses [Playwright](https://playwright.dev/) for automated end-to-end UI testing across menus, canvas interactions, audio controls, difficulty settings, and gameplay loops.

Run tests in headless mode:

```powershell
npm run test:ui
```

Run tests with headed browser:

```powershell
npm run test:ui:headed
```

Run tests in interactive Playwright UI mode:

```powershell
npm run test:ui:ui
```

View HTML test report:

```powershell
npm run test:ui:report
```

This serves the built app locally so you can verify production output.

## Scripts

- `npm run dev`: Start local dev server
- `npm run build`: TypeScript compile + Vite production build
- `npm run preview`: Serve production build locally

## Project Structure

```text
src/
  audio/
  engine/
  entities/
  map/
  system/
  ui/
  visuals/
  main.ts
```

## Troubleshooting

### `npm` or `node` is not recognized

If PowerShell says `npm` or `node` is not recognized:

1. Install Node.js from the official installer: https://nodejs.org/
2. Close and reopen VS Code (or your terminal) after install.
3. Verify again:

```powershell
node -v
npm -v
```

If still failing, confirm Node is on your PATH environment variable.

## Notes

- Game canvas is configured for a 1280x960 playfield.
- Visuals are currently generated using in-engine space-themed sprite rendering.
