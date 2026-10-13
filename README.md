# Alireza — Architecture Portfolio (MVP)

Scroll-driven portfolio. A single 3D building turns as you scroll and moves through
the stages of a project: **sketch → plan → extrusion → massing → render → built (night)**.

Persian, right-to-left (`<html lang="fa" dir="rtl">`, Vazirmatn font, Persian digits,
Solar Hijri years). Layout uses CSS logical properties, so switching `dir` mirrors it.

Stack: Vite · Three.js · Lenis (smooth scroll). No framework, no backend.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Run with Docker

```bash
docker compose up -d --build   # http://localhost:8080
```

Multi-stage build: Node builds the static site, nginx serves it (gzip, immutable
caching for hashed assets, SPA fallback).

## Where things live

| File | What |
| --- | --- |
| `src/stages.js` | Story stages: copy, colours, camera, which layers are visible |
| `src/scene.js` | Three.js scene: procedural building, plan drawing, context, lighting |
| `src/data/projects.js` | Project list (placeholder content) |
| `src/main.js` | Scroll wiring, panels, project grid |
| `docs/BRIEF-fa.md` | Research + what we need from the client (Persian) |
