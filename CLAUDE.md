# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Workipedia is a standalone interactive graph visualization of Shadow Work's global issues catalog. It's a **separate repository** that extracts data from the parent Shadow Work monorepo and builds a static website for public deployment.

**Key Distinction:** This is NOT part of the Shadow Work monorepo. It's a focused visualization tool that consumes data from `../docs/technical/simulation-systems/` in the parent repo.

## Development Commands

```bash
# Development with HMR (Hot Module Replacement)
pnpm dev              # Starts dev server at http://localhost:3000

# Production Build
pnpm build            # Full production build (TypeScript + Vite)
pnpm build:full       # Extract data + build (use before deployment)
pnpm preview          # Preview production build at http://localhost:4173

# Data Pipeline
pnpm extract-data     # Extract issues/systems from parent repo

# Type Checking
pnpm typecheck        # Validate TypeScript types
```

### Development vs Preview

- **`pnpm dev`** - Use for active development. Runs Vite dev server with instant HMR updates.
- **`pnpm preview`** - Serves the production build from `dist/`. Requires rebuild to see changes.

When making CSS or code changes, use `pnpm dev` to see changes instantly without rebuilding.

## Architecture

### Data Pipeline

**New Architecture (YAML as Source of Truth):**
```
Parent Repo                          Shadow Workipedia
├─ data/issues/*.yaml        →      ├─ scripts/extract-data.ts
│  (structured game data)           │  (reads YAML + wiki articles)
├─ CONNECTIVITY-INDEX.json   →      ├─ public/data.json (generated)
└─ wiki/issues/*.md          →      └─ src/main.ts (loads data)
   (generated from YAML)
```

**Data Flow:**
1. **Source of truth**: `../data/issues/*.yaml` - structured issue data
2. **Wiki generation**: `pnpm data:generate-wiki` (in parent repo) → `wiki/issues/*.md`
3. **Graph extraction**: `pnpm extract-data` reads wiki + catalog → `public/data.json`
4. **Visualization**: Web app loads `data.json` at runtime

**Commands:**
```bash
# In parent repo (shadow-work/)
pnpm data:migrate-wiki    # One-time: convert wiki → YAML
pnpm data:generate-wiki   # Generate wiki from YAML (after editing YAML)
pnpm data:validate        # Validate YAML against schema

# In this repo (shadow-workipedia/)
pnpm extract-data         # Generate data.json from wiki articles
```

**Key Points:**
- Edit `../data/issues/*.yaml` for game balance or content changes
- Run `pnpm data:generate-wiki` after YAML changes to update wiki
- Don't edit `wiki/issues/*.md` directly (generated files)
- 329 issue articles, 34 system articles
- 9 categories: Existential, Economic, Social, Political, Environmental, Security, Technological, Cultural, Infrastructure

**Legacy Note:** `ISSUE-CATALOG.md` is being phased out. The YAML files in `data/issues/` are the canonical source.

### Core Modules

- **`src/types.ts`** - TypeScript interfaces for graph data structure
  - `GraphNode`: Issues (329) and systems (34) with metadata
  - `GraphEdge`: Connections between nodes (issue-issue, issue-system, system-system)
  - `IssueCategory`: 9 categories (Existential, Economic, Social, Political, Environmental, Security, Technological, Cultural, Infrastructure)
  - `IssueUrgency`: Critical, High, Medium, Low, Latent

- **`src/graph.ts`** - D3 force simulation wrapper
  - `GraphSimulation` class manages d3-force physics
  - Node positioning, link forces, collision detection
  - Configurable simulation parameters (charge strength, link distance)

- **`src/interactions.ts`** - Canvas interaction handlers
  - Pan/zoom with d3-zoom
  - Node hover/click detection using quadtree spatial indexing
  - Touch support for mobile

- **`src/main.ts`** - Application entry point
  - Initialization order is critical (see below)
  - Filter bar, search, detail panel, canvas rendering
  - Event handlers for category filters and node selection

### Critical Implementation Details

**Initialization Order (src/main.ts):**
The application has dependencies between components that must initialize in this sequence:
1. Canvas setup and context
2. Transform state and graph simulation
3. State variables (`activeCategories`, `searchTerm`, `hoveredNode`, `selectedNode`)
4. DOM elements (tooltip, detail panel, filters)
5. Filter/search event handlers
6. Canvas interaction handlers
7. Render function definition
8. **Finally:** `resizeCanvas()` and window resize listener

**Why:** `resizeCanvas()` calls `render()` internally, which depends on all state variables and handlers being initialized first. Calling it too early causes "ReferenceError: Cannot access 'X' before initialization" errors.

**Canvas Rendering Strategy:**
- Full canvas clear + redraw on each tick (not incremental)
- Quadtree for efficient hover detection (O(log n) vs O(n))
- Render order: edges → nodes → labels (for proper layering)

### Type System

TypeScript is configured with strict mode:
- `strict: true` - All strict checks enabled
- `noUnusedLocals` and `noUnusedParameters` - Catch unused code
- No `any` types allowed without explicit annotation

### Build Configuration

**Development (vite.config.ts):**
- Dev server on port 3000
- Source maps enabled for debugging

**Production:**
- Terser minification with console stripping
- Single bundle output (no code splitting for simplicity)
- Source maps enabled for error tracking
- Tree-shaking removes unused code

## Data Schema

**Node Types:**
```typescript
{
  id: string              // Kebab-case identifier
  type: 'issue' | 'system'
  label: string           // Display name
  color: string           // Category/system color
  size: number            // Visual size (4-20px based on urgency/connections)

  // Issue-specific
  category?: IssueCategory
  urgency?: IssueUrgency
  description?: string
  publicConcern?: number  // 0-100
  economicImpact?: number // 0-100
  socialImpact?: number   // 0-100

  // System-specific
  domain?: string
  connectionCount?: number
}
```

**Edge Types:**
```typescript
{
  source: string          // Node ID
  target: string          // Node ID
  type: 'issue-issue' | 'issue-system' | 'system-system'
  strength: number        // 0-1 (affects link distance)
  label?: string          // Connection description
  bidirectional?: boolean // Whether connection works both ways
}
```

## Deployment

This project generates a **fully static website** with no server dependencies. The build output in `dist/` can be deployed to any static hosting:

**Before Deployment:**
```bash
pnpm extract-data    # Refresh data from parent repo
pnpm build           # Build static site
```

**Deployment Targets:**
- Vercel: `vercel deploy dist --prod`
- Netlify: Drag-and-drop `dist/` folder or connect repo
- GitHub Pages: `git subtree push --prefix dist origin gh-pages`

**Build Output:**
- `dist/index.html` - Single HTML file with meta tags
- `dist/assets/` - Bundled JS/CSS (cache-friendly hashes)
- `dist/data.json` - Graph data (loaded at runtime)
- `dist/og-image.svg` - Social media preview image

## Common Issues

**CSS Changes Not Showing:**
- Use `pnpm dev` (not `pnpm preview`) for instant HMR updates
- If using preview, rebuild with `pnpm build` first
- Clear Vite cache: `rm -rf node_modules/.vite`

**Initialization Errors (ReferenceError):**
- Check initialization order in `src/main.ts`
- Ensure all dependencies are declared before being used
- `resizeCanvas()` must be called AFTER all state variables are initialized

**Data Extraction Fails:**
- Verify parent repo exists at `../` relative path
- Check parent repo has `docs/technical/simulation-systems/ISSUE-CATALOG.md`
- Falls back to mock data if parent files missing (5 sample issues)

**Graph Performance Issues:**
- Consider reducing `alphaDecay` in `src/graph.ts` for faster settling
- Adjust force strengths if nodes cluster too tightly/spread too far
- Quadtree spatial indexing already optimizes hover detection

## Style Guidelines

**Colors:**
- Background: `#0f172a` (dark blue-gray)
- Text: `#e2e8f0` (light gray)
- Borders: `rgba(255, 255, 255, 0.1)` (subtle white)
- Category colors defined in `scripts/extract-data.ts` and `src/main.ts`

**Inactive filter button text:**
- Must use light color (`#e2e8f0`) with `!important` override
- Prevents dark-on-dark text visibility issues
- Active buttons use category color background with dark text

**Responsive Breakpoints:**
- 768px: Tablet (filters stack vertically, detail panel adjusts)
- 480px: Mobile (extra compact, bottom-sheet detail panel)
