# Role Redesign — AI Routing Workshop (Open Version)

An interactive tool that helps an organization decide **where humans stay in the loop** as AI enters a role, and **how that reshapes the skills that matter**. It works for any role: pull tasks & skills from O*NET, or upload your own.

Built by the Burning Glass Institute. An open, employer-input version of the SFWI workshop tool.

## What it does

Four steps:

1. **Choose a role** — search 900+ O*NET occupations (by title or common job title), or paste/upload your own tasks & skills.
2. **Cluster tasks** — group the role's tasks into clusters. O*NET roles arrive pre-clustered (grouped by O*NET work activity); rename, merge, split, or move tasks. Custom uploads start unclustered and you build the clusters.
3. **Route clusters** — answer 8 structured questions per cluster. A constraint-based, one-way-ratchet framework sets each cluster to **Human-Led**, **Human-in-the-Loop**, **Human-on-the-Loop**, or **Full Auto**, and names the binding constraint.
4. **Sort skills** — drag (or tap) each skill into the cluster where it matters most. See live how AI integration **deepens, sustains, or displaces** each skill, plus a downloadable before/after report.

## Data source

Task & skill data is bundled from the **O*NET 30.3 database** (U.S. Department of Labor, released under CC BY 4.0). A build script transforms the raw O*NET text release into one small JSON per occupation, served statically — no API key or backend required.

- `public/onet/index.json` — searchable occupation list (title, common titles, job family)
- `public/onet/{soc}.json` — per-occupation tasks, suggested clusters, and skills (≤30, mapped to Foundational / Core / Baseline categories with O*NET descriptions as tooltips)
- `public/onet/meta.json` — dataset version + generation date

### Refreshing the O*NET data

When a new O*NET release ships:

1. Download the tab-delimited text release from <https://www.onetcenter.org/database.html> and unzip it.
2. Run the build script, pointing it at the unzipped folder:
   ```bash
   node scripts/build-onet.mjs /path/to/db_XX_X_text
   ```
   (Defaults to `../_onet_build/db_30_3_text` if no path is given.)
3. Update the `VERSION` constant in `scripts/build-onet.mjs` and commit the regenerated `public/onet/`.

## Run locally

```bash
npm install
npm run dev      # dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Deploy

Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Vite — no configuration needed. Every push redeploys automatically.

## Tech

React + Vite, plain CSS (BGI brand), Papa Parse (CSV upload), lucide-react (icons). No backend.
