#!/usr/bin/env node
/**
 * Pulsar Galaxy Explorer — Data Ingestion Script
 * Parses ATNF v2.7.0 catalogue + McGill Magnetar Catalogue
 * Classifies objects, computes derived quantities, stores in SQLite
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'neutron_stars.db');
const ATNF_PATH = path.join(__dirname, '..', 'attached_assets', 'atnf_raw_1777769649726.csv');
const MAGNETAR_PATH = path.join(__dirname, '..', 'attached_assets', 'magnetars_raw_1777769649726.csv');

// Ensure data dir exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ── Constants ────────────────────────────────────────────────────────────────
const I_NS = 1e45;            // moment of inertia [g cm²]
const R_SUN_GC = 8.5;         // Sun's distance from GC [kpc]

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseFloat_(s) {
  if (!s || s.trim() === '*' || s.trim() === '') return null;
  const v = parseFloat(s.trim());
  return isNaN(v) ? null : v;
}

function parseInt_(s) {
  if (!s || s.trim() === '*' || s.trim() === '') return null;
  const v = parseInt(s.trim(), 10);
  return isNaN(v) ? null : v;
}

function parseStr(s) {
  if (!s || s.trim() === '*' || s.trim() === '') return null;
  return s.trim();
}

function audioFreq(p0) {
  if (!p0 || p0 <= 0) return null;
  return Math.min(2000, Math.max(40, 440 / p0));
}

function galToScene(gl_deg, gb_deg, dist_kpc) {
  if (dist_kpc == null) dist_kpc = 10;
  const gl = gl_deg * Math.PI / 180;
  const gb = gb_deg * Math.PI / 180;
  // Heliocentric galactic Cartesian (X toward GC, Y north, Z east)
  const xh = dist_kpc * Math.cos(gb) * Math.cos(gl);
  const yh = dist_kpc * Math.sin(gb);
  const zh = dist_kpc * Math.cos(gb) * Math.sin(gl);
  // Shift to galactocentric
  return { x: R_SUN_GC - xh, y: yh, z: zh };
}

// Convert RA "HH MM SS.s" + Dec "±DD MM SS.s" to approximate JNAME prefix
function raDeclToJName(ra_str, dec_str) {
  if (!ra_str || !dec_str) return null;
  const raParts = ra_str.trim().split(/\s+/);
  const decParts = dec_str.trim().replace(/^([+-])/, '$1 ').split(/\s+/);
  const sign = dec_str.trim().startsWith('-') ? '-' : '+';
  const decClean = dec_str.trim().replace(/^[+-]/, '');
  const decPartsClean = decClean.split(/\s+/);
  const hh = (raParts[0] || '00').padStart(2, '0');
  const mm = (raParts[1] || '00').padStart(2, '0');
  const dd = (decPartsClean[0] || '00').padStart(2, '0');
  const dm = (decPartsClean[1] || '00').padStart(2, '0');
  return `J${hh}${mm}${sign}${dd}${dm}`;
}

// ── Parse McGill Magnetar Catalogue ─────────────────────────────────────────
function parseMagnetars() {
  const lines = fs.readFileSync(MAGNETAR_PATH, 'utf8').split('\n');
  const header = lines[0].split(',');
  const magnetars = [];
  const magnetarJNames = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const obj = {};
    header.forEach((h, idx) => { obj[h.trim()] = (cols[idx] || '').trim(); });

    const name = obj['Name'] || '';
    if (name.includes('#')) continue; // Unconfirmed candidates

    const jname = raDeclToJName(obj['RA'], obj['Decl']);
    if (jname) magnetarJNames.add(jname);

    const period = parseFloat_(obj['Period']);
    const pdot = parseFloat_(obj['Pdot']);
    const dist = parseFloat_(obj['Dist']);
    const assoc = parseStr(obj['Assoc']);
    const activity = parseStr(obj['Activity']);

    // Try to parse last outburst year from Activity field
    let lastOutburst = null;
    let outburstCount = 0;
    const actStr = obj['Activity'] || '';
    if (actStr.includes('B')) {
      // Activity codes: B=burst, G=giant flare, T=transient, F=flare
      outburstCount = (actStr.match(/B/g) || []).length;
    }

    magnetars.push({
      name,
      jname,
      period_s: period,
      pdot: pdot,
      bsurf_g: parseFloat_(obj['B']),
      edot_ergs: parseFloat_(obj['Edot']),
      age_yr: parseFloat_(obj['Age']),
      dist_kpc: dist,
      assoc,
      activity: actStr,
      last_outburst_year: lastOutburst,
      outburst_count: outburstCount,
      ra_str: obj['RA'],
      dec_str: obj['Decl'],
    });
  }

  console.log(`Parsed ${magnetars.length} confirmed magnetars from McGill`);
  return { magnetars, magnetarJNames };
}

// ── Parse ATNF Catalogue ─────────────────────────────────────────────────────
function parseATNF(magnetarJNames) {
  const content = fs.readFileSync(ATNF_PATH, 'utf8');
  const lines = content.split('\n');

  // Find column header line
  let colLine = null;
  for (const line of lines) {
    if (line.startsWith('#;PSRJ')) { colLine = line; break; }
  }
  if (!colLine) throw new Error('Could not find ATNF column header');

  // Parse columns (strip leading # and split by ;)
  const cols = colLine.replace(/^#/, '').split(';').map(s => s.trim());
  console.log('ATNF columns:', cols.slice(0, 10).join(', '), '...');

  const idxOf = (name) => cols.indexOf(name);
  const IDX = {
    PSRJ:   idxOf('PSRJ'),
    RAJ:    idxOf('RAJ'),
    DECJ:   idxOf('DECJ'),
    Gl:     idxOf('Gl'),
    Gb:     idxOf('Gb'),
    P0:     idxOf('P0'),
    P1:     idxOf('P1'),
    DM:     idxOf('DM'),
    RM:     idxOf('RM'),
    W50:    idxOf('W50'),
    BINARY: idxOf('BINARY'),
    DIST:   idxOf('DIST'),
    ZZ:     idxOf('ZZ'),
    XX:     idxOf('XX'),
    YY:     idxOf('YY'),
    ASSOC:  idxOf('ASSOC'),
    DISC:   idxOf('DISC.'),
    PSR:    idxOf('PSR'),
    NGLT:   idxOf('NGLT'),
    AGE:    idxOf('AGE'),
    BSURF:  idxOf('BSURF'),
    EDOT:   idxOf('EDOT'),
  };

  const stars = [];

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(';');
    if (parts.length < 10) continue;

    const get = (idx) => (idx >= 0 && idx < parts.length) ? parts[idx] : '';

    const jname = parseStr(get(IDX.PSRJ));
    if (!jname) continue;

    // Skip extragalactic (SMC/LMC) for cleaner viz - keep but mark
    const assoc = parseStr(get(IDX.ASSOC)) || '';
    const psr_type = parseStr(get(IDX.PSR)) || '';
    const binary = parseStr(get(IDX.BINARY));
    const hasBinary = binary !== null && binary !== '';

    const p0 = parseFloat_(get(IDX.P0));
    const p1 = parseFloat_(get(IDX.P1));
    const dm = parseFloat_(get(IDX.DM));
    const dist_kpc = parseFloat_(get(IDX.DIST));
    const gl = parseFloat_(get(IDX.Gl));
    const gb = parseFloat_(get(IDX.Gb));

    // Derived quantities
    let bsurf_g = parseFloat_(get(IDX.BSURF));
    let age_yr = parseFloat_(get(IDX.AGE));
    let edot_ergs = parseFloat_(get(IDX.EDOT));

    // Compute if missing and data available
    if (bsurf_g === null && p0 !== null && p1 !== null && p1 > 0) {
      bsurf_g = 3.2e19 * Math.sqrt(p0 * p1);
    }
    if (age_yr === null && p0 !== null && p1 !== null && p1 > 0) {
      age_yr = p0 / (2 * p1);
    }
    if (edot_ergs === null && p0 !== null && p1 !== null && p0 > 0) {
      edot_ergs = 4 * Math.PI * Math.PI * I_NS * p1 / Math.pow(p0, 3);
    }

    // 3D position
    const pos = (gl !== null && gb !== null)
      ? galToScene(gl, gb, dist_kpc)
      : { x: 0, y: 0, z: 0 };

    // Extract discovery year
    const disc_str = parseStr(get(IDX.DISC));
    let disc_year = null;
    if (disc_str) {
      const m = disc_str.match(/(\d{4})/);
      if (m) disc_year = parseInt(m[1], 10);
    }

    // Classification
    let ns_class = classify(jname, psr_type, assoc, binary, p0, p1, magnetarJNames);

    const af = audioFreq(p0);

    // 4-char prefix match for magnetar jnames
    const jname4 = jname.substring(0, 5);
    for (const mj of magnetarJNames) {
      if (mj.substring(0, 5) === jname4) { ns_class = 'MAGNETAR'; break; }
    }

    stars.push({
      jname,
      bname: null,
      ra: parseStr(get(IDX.RAJ)),
      dec: parseStr(get(IDX.DECJ)),
      gl,
      gb,
      x_kpc: pos.x,
      y_kpc: pos.y,
      z_kpc: pos.z,
      dist_kpc,
      p0,
      p1,
      dm,
      rm: parseFloat_(get(IDX.RM)),
      age_yr,
      bsurf_g,
      edot_ergs,
      w50: parseFloat_(get(IDX.W50)),
      binary_model: binary,
      assoc: assoc || null,
      nglitch: parseInt_(get(IDX.NGLT)),
      ns_class,
      audio_freq: af,
      is_msp: p0 !== null ? (p0 < 0.03 ? 1 : 0) : 0,
      has_binary: hasBinary ? 1 : 0,
      discovery_year: disc_year,
      source: 'atnf',
    });
  }

  console.log(`Parsed ${stars.length} objects from ATNF`);
  return stars;
}

function classify(jname, psr_type, assoc, binary, p0, p1, magnetarJNames) {
  // Magnetar check
  if (psr_type && (psr_type.includes('AXP') || psr_type.includes('SGR'))) return 'MAGNETAR';

  // RRAT
  if (psr_type && psr_type.includes('RRAT')) return 'RRAT';

  // Isolated NS (XINS / XTINS)
  if (psr_type && (psr_type.includes('XINS') || psr_type.includes('XTINS'))) return 'ISOLATED_NS';

  // MSP
  if (p0 !== null && p0 < 0.03) {
    if (binary) return 'RECYCLED_MSP';
    return 'FAST_MSP';
  }

  // CCO: associated with SNR, no P1 measurement
  if (assoc && assoc.includes('SNR') && p1 === null) return 'CCO';

  // Binary pulsar (slow)
  if (binary && p0 !== null && p0 >= 0.03) return 'BINARY_PULSAR';

  return 'CANONICAL';
}

// ── Add McGill-only magnetars (not already in ATNF) ──────────────────────────
function mergeMagnetars(atnfStars, mcgillMagnetars) {
  const existingJNames = new Set(atnfStars.map(s => s.jname));
  let added = 0;

  for (const mag of mcgillMagnetars) {
    if (!mag.jname) continue;
    // Check 4-char prefix match
    const prefix = mag.jname.substring(0, 5);
    let found = false;
    for (const j of existingJNames) {
      if (j.substring(0, 5) === prefix) { found = true; break; }
    }
    if (found) continue;

    // Need GL/GB — attempt to compute from RA/Dec (rough)
    // For non-matched magnetars, skip positioning (place at center)
    const p0 = mag.period_s;
    const af = audioFreq(p0);

    atnfStars.push({
      jname: mag.jname,
      bname: mag.name,
      ra: mag.ra_str || null,
      dec: mag.dec_str || null,
      gl: null,
      gb: null,
      x_kpc: null,
      y_kpc: null,
      z_kpc: null,
      dist_kpc: mag.dist_kpc,
      p0,
      p1: mag.pdot,
      dm: null,
      rm: null,
      age_yr: mag.age_yr,
      bsurf_g: mag.bsurf_g,
      edot_ergs: mag.edot_ergs,
      w50: null,
      binary_model: null,
      assoc: mag.assoc,
      nglitch: null,
      ns_class: 'MAGNETAR',
      audio_freq: af,
      is_msp: 0,
      has_binary: 0,
      discovery_year: null,
      source: 'mcgill',
      last_outburst_year: mag.last_outburst_year,
      outburst_count: mag.outburst_count,
    });
    added++;
    existingJNames.add(mag.jname);
  }

  console.log(`Added ${added} McGill-only magnetars`);
  return atnfStars;
}

// ── Store in SQLite ───────────────────────────────────────────────────────────
function storeInDB(stars) {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS neutron_stars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jname TEXT UNIQUE NOT NULL,
      bname TEXT,
      ra TEXT,
      dec TEXT,
      gl REAL,
      gb REAL,
      x_kpc REAL,
      y_kpc REAL,
      z_kpc REAL,
      dist_kpc REAL,
      p0 REAL,
      p1 REAL,
      dm REAL,
      rm REAL,
      age_yr REAL,
      bsurf_g REAL,
      edot_ergs REAL,
      w50 REAL,
      binary_model TEXT,
      assoc TEXT,
      nglitch INTEGER,
      ns_class TEXT NOT NULL,
      audio_freq REAL,
      is_msp INTEGER DEFAULT 0,
      has_binary INTEGER DEFAULT 0,
      discovery_year INTEGER,
      source TEXT DEFAULT 'atnf',
      last_outburst_year INTEGER,
      outburst_count INTEGER,
      spectral_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ns_class ON neutron_stars(ns_class);
    CREATE INDEX IF NOT EXISTS idx_jname ON neutron_stars(jname);
  `);

  // Clear existing data
  db.exec(`DELETE FROM neutron_stars`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO neutron_stars
      (jname, bname, ra, dec, gl, gb, x_kpc, y_kpc, z_kpc, dist_kpc,
       p0, p1, dm, rm, age_yr, bsurf_g, edot_ergs, w50,
       binary_model, assoc, nglitch, ns_class, audio_freq,
       is_msp, has_binary, discovery_year, source,
       last_outburst_year, outburst_count)
    VALUES
      (@jname, @bname, @ra, @dec, @gl, @gb, @x_kpc, @y_kpc, @z_kpc, @dist_kpc,
       @p0, @p1, @dm, @rm, @age_yr, @bsurf_g, @edot_ergs, @w50,
       @binary_model, @assoc, @nglitch, @ns_class, @audio_freq,
       @is_msp, @has_binary, @discovery_year, @source,
       @last_outburst_year, @outburst_count)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        ...row,
        last_outburst_year: row.last_outburst_year || null,
        outburst_count: row.outburst_count || null,
      });
    }
  });

  insertMany(stars);

  // Print class breakdown
  const counts = db.prepare(`SELECT ns_class, COUNT(*) as cnt FROM neutron_stars GROUP BY ns_class ORDER BY cnt DESC`).all();
  console.log('\n── Class breakdown ──────────────────────────');
  counts.forEach(r => console.log(`  ${r.ns_class.padEnd(16)} ${r.cnt}`));
  console.log(`  ${'TOTAL'.padEnd(16)} ${stars.length}`);
  console.log('─────────────────────────────────────────────\n');

  db.close();
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Pulsar Galaxy Explorer — Data Ingestion v2.0');
  console.log('═══════════════════════════════════════════════\n');

  const { magnetars, magnetarJNames } = parseMagnetars();
  let stars = parseATNF(magnetarJNames);
  stars = mergeMagnetars(stars, magnetars);
  storeInDB(stars);

  console.log(`✓ Ingestion complete. ${stars.length} objects stored in ${DB_PATH}`);
}

main();
