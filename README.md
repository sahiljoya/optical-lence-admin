# erprahul.online/2 — source

The `/2` page of the VOC ERP portal (soft, colourful CRM-style owner dashboard for Vishal Optical Co.).
Front-end only: all data is mock data in `src/components/veriwide/mockData.ts`. No database, no auth, no API calls.

## Run it

Requires [bun](https://bun.sh) (or npm/pnpm — then use `npm install` / `pnpm install`).

```
bun install
bun run dev
```

Open http://localhost:8080/2

## Build for deployment

```
bun run build
```

Output lands in `dist/`.

## Where things live

| Path | What it is |
| --- | --- |
| `src/routes/2.tsx` | The `/2` route: page title, description, social-preview tags, and which component renders |
| `src/components/veriwide/VeriwidePage.tsx` | The whole page layout: rail, header, KPI tiles, panels, saved notes |
| `src/components/veriwide/Charts.tsx` | The charts (recharts) and the date-range / chart-type selectors |
| `src/components/veriwide/mockData.ts` | Every number, label and row the page shows |
| `src/styles/veriwide.css` | All the page's colours, cards and spacing |
| `src/styles.css` | Global Tailwind setup and base colours |
| `src/routes/__root.tsx` | The page shell every route shares (favicon, fonts, 404 screen) |
| `src/router.tsx`, `src/routeTree.gen.ts` | How the app finds its routes (`routeTree.gen.ts` regenerates itself) |
| `src/components/ui/select.tsx` | The dropdown used by the selectors |
