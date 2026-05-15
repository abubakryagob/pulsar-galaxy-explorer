# 🌌 Pulsar Galaxy Explorer

An interactive 3D visualization of **4,355 neutron stars** in our galaxy — pulsars, magnetars, RRATs, millisecond pulsars, and more — built on real astronomical data from the ATNF Pulsar Catalogue and McGill Magnetar Catalogue.

[![WebGL](https://img.shields.io/badge/WebGL-Three.js-brightgreen)](https://threejs.org)
[![Backend](https://img.shields.io/badge/Backend-Express%205000-blue)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Data-SQLite%20%2B%20ATNF-orange)](https://www.atnf.csiro.au/research/pulsar/psrcat/)
[![Objects](https://img.shields.io/badge/Objects-4%2C355%20Neutron%20Stars-purple)](https://github.com/abubakryagob/pulsar-galaxy-explorer)

---

## ✨ Features

### 🔬 Scientific Data Pipeline
- **4,355 real neutron star objects** from ATNF v2.7.0 + McGill Magnetar Catalogue
- **7 object classes** automatically classified: Canonical Pulsar, Recycled MSP, Fast MSP, RRAT, Magnetar, Binary Pulsar, Isolated Neutron Star
- **Derived physical properties** computed per object: surface magnetic field (B_surf), characteristic age, spin-down luminosity (Ėdot), audio frequency
- **SQLite backend** regenerated on demand from raw CSV source data

### 🎨 3D Visualization (Three.js)
- **InstancedMesh rendering** — one draw call per class (8 total) for all 4,351 visible objects
- **Per-class visual identity**: magnetars pulse red, RRATs flicker in/out, MSPs glow rapidly, binaries render cyan
- **60,000-particle galactic star field** with 4 spiral arm traces
- **Coordinate grid**, ☉ Sun marker, Galactic Centre marker with labels
- **3 camera modes**: Galaxy 3D / Top-Down / Edge-On with smooth animated transitions

### 🔭 Interactive Controls
- **Left sidebar**: class checkboxes with live counts, 3 range sliders (period / distance / B-field), live search, random object selector
- **Right detail panel**:
  - *Public mode*: plain-English spin rates, historical distance analogies, magnetic field comparisons
  - *Researcher mode*: P₀, Ṗ, DM, log(B), Age, Ėdot, glitch count, binary type, direct ATNF catalogue link
- **Interactive P-Ṗ diagram** with cross-linking to the 3D view
- **Cinematic tour mode** for guided galaxy exploration
- **Deep-link / shareable URLs** per star

### 🎵 Audio
- **Web Audio API** engine: hover ticks + 3-second click tones at each pulsar's real audio frequency
- Period-to-frequency conversion (ms → Hz) using real rotation periods

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v18 or later
- `npm`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/abubakryagob/pulsar-galaxy-explorer.git
cd pulsar-galaxy-explorer

# 2. Install dependencies
npm install

# 3. Generate the database from raw CSV data
node scripts/ingest.js

# 4. Start the server
node server.js
```

Then open **http://localhost:5000** in your browser.

> **Note:** Step 3 must be run at least once before starting the server. It reads the CSV files in `data/` and writes `data/neutron_stars.db`. Re-run it any time you update the source CSVs.

---

## 📁 Project Structure

```
pulsar-galaxy-explorer/
├── index.html                  # App entry point (served by Express)
├── server.js                   # Express server — REST API on port 5000
├── package.json                # Node dependencies
├── .env.example                # Environment variable template
│
├── assets/
│   ├── css/                    # Stylesheets (Space Grotesk + JetBrains Mono)
│   ├── js/                     # Three.js app, rendering, audio, UI
│   └── media/                  # Videos, images
│
├── data/
│   ├── atnf_v2.7.0.csv         # ATNF Pulsar Catalogue source data
│   ├── mcgill_magnetars.csv    # McGill Magnetar Catalogue source data
│   └── neutron_stars.db        # ⚠️ Generated — not tracked in git
│
└── scripts/
    └── ingest.js               # Data pipeline: CSV → classification → SQLite
```

---

## 🔌 API Reference

The Express server exposes the following endpoints on port 5000:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stars` | All neutron star objects |
| `GET` | `/api/stars/:jname` | Single object by J-name |
| `GET` | `/api/stars/class/:cls` | Objects filtered by class |
| `GET` | `/api/stats` | Summary statistics (counts per class, etc.) |
| `GET` | `/api/ppdot` | P-Ṗ diagram data |
| `GET` | `/api/search?q=` | Full-text search |
| `POST` | `/api/refresh` | Re-run ingest pipeline and reload database |

### Object Classes

| Class | Description |
|-------|-------------|
| `Canonical` | Standard rotation-powered pulsars |
| `Recycled MSP` | Recycled millisecond pulsars |
| `Fast MSP` | Fast millisecond pulsars (P < 5ms) |
| `RRAT` | Rotating Radio Transients |
| `Magnetar` | Magnetars (from McGill catalogue) |
| `Binary Pulsar` | Pulsars in binary systems |
| `Isolated NS` | Isolated neutron stars |

---

## 🔬 Technical Details

### Technologies
- **Three.js r163** — 3D rendering with WebGL
- **Express.js** — REST API backend
- **SQLite** (via `better-sqlite3`) — local database, generated from CSV
- **Web Audio API** — real-time audio synthesis
- **Space Grotesk + JetBrains Mono** — typography

### Data Sources
- [ATNF Pulsar Catalogue v2.7.0](https://www.atnf.csiro.au/research/pulsar/psrcat/) — Manchester et al. (2005)
- [McGill Magnetar Catalogue](https://www.physics.mcgill.ca/~pulsar/magnetar/main.html) — Olausen & Kaspi (2014)

### Performance
- `InstancedMesh` per class — 8 draw calls for all visible objects
- Distance-based culling and LOD for far objects
- Chunked loading for smooth initial render

---

## 🌟 Scientific Background

**Pulsars** are rapidly rotating neutron stars emitting beams of electromagnetic radiation. As they spin, these beams sweep across space like lighthouse beams — when one points toward Earth, we detect a pulse.

- **Period range**: 1.4 ms to 23 seconds
- **First discovery**: 1967 (Jocelyn Bell Burnell)
- **Formation**: Remnants of core-collapse supernovae
- **Magnetars**: Subset with extreme magnetic fields (~10¹⁵ G), prone to outbursts and giant flares

---

## 🤝 Contributing

Contributions welcome. Areas for future development:

- Extended object types (black holes, quasars, SNRs)
- VR/AR support
- Mobile responsiveness improvements
- Additional catalogue integrations
- Gravitational wave source overlay

---

## 📜 License

MIT License — free to use for educational and research purposes.

---

*Made with ❤️ for astronomy education and scientific visualization*
