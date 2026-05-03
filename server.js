/**
 * Pulsar Galaxy Explorer — API + Static Server
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = 5000;

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// ── Lazy DB init ──────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'neutron_stars.db');

function getDB() {
  const Database = require('better-sqlite3');
  if (!fs.existsSync(DB_PATH)) {
    console.log('DB not found — running ingestion...');
    execSync('node scripts/ingest.js', { stdio: 'inherit' });
  }
  return new Database(DB_PATH, { readonly: true });
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────

// Lightweight list for Three.js rendering
app.get('/api/stars', (req, res) => {
  try {
    const db = getDB();
    const stars = db.prepare(`
      SELECT id, jname, bname, gl, gb, x_kpc, y_kpc, z_kpc, dist_kpc,
             ns_class, p0, p1, bsurf_g, edot_ergs, is_msp, has_binary,
             audio_freq, discovery_year, assoc, nglitch
      FROM neutron_stars
      WHERE x_kpc IS NOT NULL AND gl IS NOT NULL
      ORDER BY id
    `).all();
    db.close();
    res.json({ count: stars.length, stars });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Full detail for a single object
app.get('/api/stars/:jname', (req, res) => {
  try {
    const db = getDB();
    const star = db.prepare(`SELECT * FROM neutron_stars WHERE jname = ?`).get(req.params.jname);
    db.close();
    if (!star) return res.status(404).json({ error: 'Not found' });
    res.json(star);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Filter by class
app.get('/api/stars/class/:cls', (req, res) => {
  try {
    const db = getDB();
    const stars = db.prepare(`
      SELECT id, jname, gl, gb, x_kpc, y_kpc, z_kpc, dist_kpc,
             ns_class, p0, bsurf_g, is_msp, audio_freq
      FROM neutron_stars WHERE ns_class = ?
    `).all(req.params.cls.toUpperCase());
    db.close();
    res.json({ count: stars.length, stars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats summary
app.get('/api/stats', (req, res) => {
  try {
    const db = getDB();
    const counts = db.prepare(`SELECT ns_class, COUNT(*) as count FROM neutron_stars GROUP BY ns_class`).all();
    const ranges = db.prepare(`
      SELECT MIN(p0) as min_p0, MAX(p0) as max_p0,
             MIN(bsurf_g) as min_b, MAX(bsurf_g) as max_b,
             COUNT(*) as total
      FROM neutron_stars
    `).get();
    const updated = db.prepare(`SELECT MAX(created_at) as last_updated FROM neutron_stars`).get();
    db.close();
    res.json({ counts, ranges, last_updated: updated.last_updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// P-Pdot data
app.get('/api/ppdot', (req, res) => {
  try {
    const db = getDB();
    const stars = db.prepare(`
      SELECT id, jname, p0, p1, bsurf_g, edot_ergs, ns_class, dist_kpc, age_yr
      FROM neutron_stars
      WHERE p0 IS NOT NULL AND p1 IS NOT NULL AND p1 > 0 AND p0 > 0
      ORDER BY p0
    `).all();
    db.close();
    res.json({ count: stars.length, stars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search by name
app.get('/api/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const db = getDB();
    const stars = db.prepare(`
      SELECT id, jname, bname, ns_class, p0, dist_kpc, x_kpc, y_kpc, z_kpc, gl, gb
      FROM neutron_stars
      WHERE jname LIKE ? OR (bname IS NOT NULL AND bname LIKE ?)
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`);
    db.close();
    res.json(stars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-run ingestion
app.get('/api/refresh', (req, res) => {
  try {
    const db_w = new (require('better-sqlite3'))(DB_PATH);
    db_w.close();
  } catch (e) {}
  execSync('node scripts/ingest.js', { stdio: 'pipe' });
  res.json({ success: true, message: 'Ingestion complete' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌌 Pulsar Galaxy Explorer`);
  console.log(`   Server: http://0.0.0.0:${PORT}`);
  console.log(`   API:    http://0.0.0.0:${PORT}/api/stars\n`);
});
