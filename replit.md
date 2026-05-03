# Pulsar Galaxy Explorer

Interactive 3D visualization of 4,355 real pulsars and neutron stars from the ATNF Pulsar Catalogue v2.7.0 and the McGill Magnetar Catalogue.

## Architecture

### Backend (Node.js + Express + SQLite)
- `server.js` — Express server on port 5000, serves static files + REST API
- `scripts/ingest.js` — one-time data pipeline (parses CSV → classifies → stores in SQLite)
- `data/neutron_stars.db` — SQLite database (4,355 objects)

### Frontend (Three.js WebGL)
- `index.html` — full-page layout (topbar, sidebar, canvas, detail panel)
- `assets/css/style.css` — design system (Space Grotesk + JetBrains Mono fonts)
- `assets/js/app.js` — Three.js app with InstancedMesh rendering, filters, audio

### Data Sources
- `attached_assets/atnf_raw_1777769649726.csv` — ATNF Pulsar Catalogue v2.7.0 (~4,351 objects)
- `attached_assets/magnetars_raw_1777769649726.csv` — McGill Magnetar Catalogue (30 objects)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stars` | All objects (lightweight — for Three.js rendering) |
| `GET /api/stars/:jname` | Full detail for one object |
| `GET /api/stars/class/:class` | Filter by ns_class |
| `GET /api/stats` | Count by class, min/max P0/Bsurf |
| `GET /api/ppdot` | P-Pdot diagram data (objects with both P0 and P1) |
| `GET /api/search?q=` | Search by jname/bname |
| `GET /api/refresh` | Re-run ingestion |

## Object Classification (ns_class)

| Class | Criteria | Count |
|-------|----------|-------|
| CANONICAL | Default (rotation-powered) | 3,071 |
| RECYCLED_MSP | P0 < 0.03s AND has binary | 411 |
| FAST_MSP | P0 < 0.03s AND no binary | 371 |
| RRAT | PSR type contains 'RRAT' | 216 |
| MAGNETAR | PSR type AXP/SGR OR in McGill list | 203 |
| BINARY_PULSAR | Binary AND P0 ≥ 0.03s | 75 |
| ISOLATED_NS | PSR type XINS | 8 |

## Visual System (Three.js)

- One `THREE.InstancedMesh` per object class (8 draw calls total)
- Colors, sizes, animations per class (magnetar pulse, RRAT flicker, MSP glow)
- 60k background star particles (galactic distribution)
- Spiral arm traces (4 arms), galactic coordinate grid
- Sun ☉ and Galactic Centre markers with labels
- Bloom post-processing (UnrealBloomPass)

## UI Features (Phase 1)
- Left sidebar: class checkboxes with counts, period/distance/B-field sliders, text search, random object
- Right panel: public view (accessible language) + researcher view (numerical data)
- Top bar: 3 view modes (Galaxy 3D / Top-Down / Edge-On), Researcher mode toggle, audio
- Audio engine: hover tick, click tone at pulsar audio frequency (Web Audio API)

## Running

```bash
# Install dependencies
npm install

# Ingest data (one-time setup)
npm run ingest

# Start server
npm start
```

## Phase Roadmap
- **Phase 1 ✓**: Backend + API + classified rendering + filters + detail panel + audio
- **Phase 2**: P-Pdot diagram (D3.js canvas, with death line, B-field/age isochrones)
- **Phase 3**: Cinematic tour mode (4 tours: First Pulsar, Fastest Spinner, Magnetar Mayhem, The Graveyard)
