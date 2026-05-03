/**
 * Pulsar Galaxy Explorer — P-Ṗ Diagram
 * Canvas 2D implementation with zoom/pan, isochrones, and cross-linking
 */

// Class colours (same palette as 3D view)
const CLS_COLORS = {
  CANONICAL:     '#4488ff',
  RECYCLED_MSP:  '#ffd700',
  FAST_MSP:      '#ffaa00',
  MAGNETAR:      '#ff2244',
  RRAT:          '#aa44ff',
  ISOLATED_NS:   '#ccddee',
  CCO:           '#7799aa',
  BINARY_PULSAR: '#00ffcc',
};

const CLS_LABEL = {
  CANONICAL:     'Canonical',
  RECYCLED_MSP:  'Recycled MSP',
  FAST_MSP:      'Fast MSP',
  MAGNETAR:      'Magnetar',
  RRAT:          'RRAT',
  ISOLATED_NS:   'Isolated NS',
  CCO:           'CCO',
  BINARY_PULSAR: 'Binary Pulsar',
};

const LOG_3_2E19 = Math.log10(3.2e19);   // ≈ 19.505
const LOG_4PI2I  = Math.log10(4 * Math.PI * Math.PI * 1e45); // ≈ 46.596

export class PPdotDiagram {
  constructor(canvas, { onClickStar } = {}) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.onClickStar = onClickStar || null;

    // Default visible data range
    this.xMin = -3.2;   // log10(P0)
    this.xMax =  2.2;
    this.yMin = -22.5;  // log10(Ṗ)
    this.yMax =  -8.0;

    this.margins = { left: 78, right: 140, top: 28, bottom: 60 };

    this.stars = [];
    this.highlighted = null;  // jname of cross-linked star
    this.hovered = null;

    // Drag state for panning
    this._drag = null;
    this._savedRange = null;

    this._setupEvents();
    this._animId = null;
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  setData(stars) {
    this.stars = stars.filter(s =>
      s.p0 != null && s.p0 > 0 &&
      s.p1 != null && s.p1 > 0 &&
      isFinite(Math.log10(s.p1))
    );
    this.render();
  }

  highlight(jname) {
    this.highlighted = jname;
    this.render();
  }

  // ── Coordinate transforms ────────────────────────────────────────────────────
  toScreen(logP, logPdot) {
    const { left, right, top, bottom } = this.margins;
    const w = this.canvas.width  - left - right;
    const h = this.canvas.height - top  - bottom;
    return {
      x: left + (logP    - this.xMin) / (this.xMax - this.xMin) * w,
      y: top  + (1 - (logPdot - this.yMin) / (this.yMax - this.yMin)) * h,
    };
  }

  toData(sx, sy) {
    const { left, right, top, bottom } = this.margins;
    const w = this.canvas.width  - left - right;
    const h = this.canvas.height - top  - bottom;
    return {
      logP:    this.xMin + (sx - left) / w * (this.xMax - this.xMin),
      logPdot: this.yMin + (1 - (sy - top) / h) * (this.yMax - this.yMin),
    };
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const { left, right, top, bottom } = this.margins;
    const pw = W - left - right;
    const ph = H - top - bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, W, H);

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, pw, ph);
    ctx.clip();

    this._drawGrid(ctx);
    this._drawGraveyard(ctx);
    this._drawBfieldLines(ctx);
    this._drawAgelines(ctx);
    this._drawEdotLines(ctx);
    this._drawDeathLine(ctx);
    this._drawPoints(ctx);

    ctx.restore(); // unclip

    this._drawAxes(ctx, W, H);
    this._drawLegend(ctx, W, H);
    if (this.hovered) this._drawTooltip(ctx, this.hovered, W, H);
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────
  _drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(50, 80, 140, 0.25)';
    ctx.lineWidth = 0.5;

    // Vertical grid lines (log P)
    for (let lp = Math.ceil(this.xMin); lp <= Math.floor(this.xMax); lp++) {
      const { x } = this.toScreen(lp, 0);
      ctx.beginPath(); ctx.moveTo(x, this.margins.top);
      ctx.lineTo(x, this.canvas.height - this.margins.bottom); ctx.stroke();
    }
    // Horizontal grid lines (log Pdot)
    for (let lp = Math.ceil(this.yMin); lp <= Math.floor(this.yMax); lp++) {
      const { y } = this.toScreen(0, lp);
      ctx.beginPath(); ctx.moveTo(this.margins.left, y);
      ctx.lineTo(this.canvas.width - this.margins.right, y); ctx.stroke();
    }
  }

  // ── B-field iso-lines: logṖ = 2*logB - 2*LOG_3_2E19 - logP ─────────────────
  _drawBfieldLines(ctx) {
    const Bvals   = [1e8, 1e10, 1e12, 1e14];
    const Blabels = ['10⁸ G', '10¹⁰ G', '10¹² G', '10¹⁴ G'];

    ctx.setLineDash([]);
    ctx.lineWidth = 1.0;

    Bvals.forEach((B, i) => {
      const logB = Math.log10(B);
      // logPdot = 2*logB - 2*LOG_3_2E19 - logP  →  slope -1 in log-log
      const intercept = 2 * logB - 2 * LOG_3_2E19;

      ctx.strokeStyle = 'rgba(160, 185, 240, 0.45)';
      ctx.beginPath();
      let started = false;

      for (let lp = this.xMin; lp <= this.xMax + 0.05; lp += 0.05) {
        const lpdot = intercept - lp;
        if (lpdot < this.yMin - 0.1 || lpdot > this.yMax + 0.1) { started = false; continue; }
        const { x, y } = this.toScreen(lp, lpdot);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();

      // Label at right edge
      const logP_labelX = this.xMax - 0.3;
      const logPdot_label = intercept - logP_labelX;
      if (logPdot_label >= this.yMin && logPdot_label <= this.yMax) {
        const { x, y } = this.toScreen(logP_labelX, logPdot_label);
        ctx.save();
        ctx.fillStyle = 'rgba(180, 200, 255, 0.75)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.translate(x - 4, y);
        ctx.rotate(-0.72);  // ~= atan(slope) in screen coords
        ctx.fillText(Blabels[i], 0, 0);
        ctx.restore();
      }
    });
    ctx.setLineDash([]);
  }

  // ── Characteristic age lines: logṖ = logP - log(2*tau) ─────────────────────
  _drawAgelines(ctx) {
    const tauVals   = [1e3, 1e5, 1e7, 1e9, 1e11];
    const tauLabels = ['10³ yr', '10⁵ yr', '10⁷ yr', '10⁹ yr', '10¹¹ yr'];

    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 0.9;

    tauVals.forEach((tau, i) => {
      const offset = Math.log10(2 * tau);  // logP - offset = logPdot
      ctx.strokeStyle = 'rgba(140, 180, 140, 0.38)';
      ctx.beginPath();
      let started = false;

      for (let lp = this.xMin; lp <= this.xMax + 0.05; lp += 0.05) {
        const lpdot = lp - offset;
        if (lpdot < this.yMin - 0.1 || lpdot > this.yMax + 0.1) { started = false; continue; }
        const { x, y } = this.toScreen(lp, lpdot);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();

      // Label at left edge of line
      const logP_lbl = this.xMin + 0.1;
      const logPdot_lbl = logP_lbl - offset;
      if (logPdot_lbl >= this.yMin && logPdot_lbl <= this.yMax) {
        const { x, y } = this.toScreen(logP_lbl, logPdot_lbl);
        ctx.save();
        ctx.fillStyle = 'rgba(160, 210, 160, 0.75)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.translate(x + 2, y - 3);
        ctx.rotate(0.75);
        ctx.fillText(tauLabels[i], 0, 0);
        ctx.restore();
      }
    });
    ctx.setLineDash([]);
  }

  // ── Ėdot iso-lines: logṖ = logEdot + 3*logP - LOG_4PI2I (slope +3) ─────────
  _drawEdotLines(ctx) {
    const EdotVals   = [1e28, 1e30, 1e32, 1e34, 1e36, 1e38];
    const EdotLabels = ['10²⁸', '10³⁰', '10³²', '10³⁴', '10³⁶', '10³⁸ erg/s'];

    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 0.7;

    EdotVals.forEach((Edot, i) => {
      const logEdot = Math.log10(Edot);
      // logPdot = logEdot - LOG_4PI2I + 3*logP
      const intercept = logEdot - LOG_4PI2I;
      ctx.strokeStyle = 'rgba(220, 160, 100, 0.30)';
      ctx.beginPath();
      let started = false;

      for (let lp = this.xMin; lp <= this.xMax + 0.05; lp += 0.05) {
        const lpdot = intercept + 3 * lp;
        if (lpdot < this.yMin - 0.1 || lpdot > this.yMax + 0.1) { started = false; continue; }
        const { x, y } = this.toScreen(lp, lpdot);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();

      // Label at right-side first visible point
      let labelP = null;
      for (let lp = this.xMax; lp >= this.xMin; lp -= 0.05) {
        const lpdot = intercept + 3 * lp;
        if (lpdot >= this.yMin && lpdot <= this.yMax) { labelP = lp; break; }
      }
      if (labelP !== null) {
        const lpdot = intercept + 3 * labelP;
        const { x, y } = this.toScreen(labelP, lpdot);
        ctx.save();
        ctx.fillStyle = 'rgba(240, 180, 120, 0.70)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.translate(x + 4, y);
        ctx.rotate(-1.24);  // slope +3 → steep angle
        ctx.fillText(EdotLabels[i], 0, 0);
        ctx.restore();
      }
    });
    ctx.setLineDash([]);
  }

  // ── Death line & graveyard shading ───────────────────────────────────────────
  _drawGraveyard(ctx) {
    // logPdot = log(1.7e-16) - 2*logP = -15.770 - 2*logP  (slope -2)
    const DL_INTERCEPT = Math.log10(1.7e-16); // ≈ -15.770

    // Fill graveyard (below death line)
    ctx.beginPath();
    // Start at bottom-left of plot
    const { x: x0, y: y0 } = this.toScreen(this.xMin, this.yMin);
    ctx.moveTo(x0, y0);

    // Trace the death line from left to right
    for (let lp = this.xMin; lp <= this.xMax + 0.05; lp += 0.05) {
      const lpdot = DL_INTERCEPT - 2 * lp;
      const { x, y } = this.toScreen(lp, lpdot);
      ctx.lineTo(x, y);
    }

    // Close to bottom-right
    const { x: xR } = this.toScreen(this.xMax, 0);
    const { y: yB } = this.toScreen(0, this.yMin);
    ctx.lineTo(xR, yB);
    ctx.lineTo(x0, yB);
    ctx.closePath();
    ctx.fillStyle = 'rgba(40, 30, 10, 0.55)';
    ctx.fill();
  }

  _drawDeathLine(ctx) {
    const DL_INTERCEPT = Math.log10(1.7e-16);

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 80, 40, 0.70)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;

    for (let lp = this.xMin; lp <= this.xMax + 0.05; lp += 0.05) {
      const lpdot = DL_INTERCEPT - 2 * lp;
      if (lpdot < this.yMin - 0.5 || lpdot > this.yMax + 0.5) { started = false; continue; }
      const { x, y } = this.toScreen(lp, lpdot);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // "Pulsar Graveyard" label
    const midLogP = (this.xMax - this.xMin) * 0.65 + this.xMin;
    const midLogPdot = DL_INTERCEPT - 2 * midLogP - 1.5;
    if (midLogPdot >= this.yMin && midLogPdot <= this.yMax) {
      const { x, y } = this.toScreen(midLogP, midLogPdot);
      ctx.save();
      ctx.fillStyle = 'rgba(220, 120, 60, 0.55)';
      ctx.font = 'italic 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pulsar Graveyard', x, y);
      ctx.restore();
    }
  }

  // ── Data points ──────────────────────────────────────────────────────────────
  _drawPoints(ctx) {
    const R = 3.5;
    const R_selected = 7.0;

    // Draw all points
    for (const s of this.stars) {
      const logP    = Math.log10(s.p0);
      const logPdot = Math.log10(s.p1);
      if (logP < this.xMin || logP > this.xMax) continue;
      if (logPdot < this.yMin || logPdot > this.yMax) continue;

      const { x, y } = this.toScreen(logP, logPdot);
      const color = CLS_COLORS[s.ns_class] || '#888888';

      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = color + 'bb'; // slight transparency
      ctx.fill();
    }

    // Highlighted / cross-linked star (from 3D click)
    if (this.highlighted) {
      const s = this.stars.find(st => st.jname === this.highlighted);
      if (s) {
        const { x, y } = this.toScreen(Math.log10(s.p0), Math.log10(s.p1));
        ctx.beginPath();
        ctx.arc(x, y, R_selected, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, R_selected, 0, Math.PI * 2);
        ctx.fillStyle = CLS_COLORS[s.ns_class] || '#fff';
        ctx.fill();
        // Crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.margins.left, y); ctx.lineTo(this.canvas.width - this.margins.right, y); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, this.margins.top); ctx.lineTo(x, this.canvas.height - this.margins.bottom); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Hovered star
    if (this.hovered) {
      const { x, y } = this.toScreen(Math.log10(this.hovered.p0), Math.log10(this.hovered.p1));
      ctx.beginPath();
      ctx.arc(x, y, R + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ── Axes ─────────────────────────────────────────────────────────────────────
  _drawAxes(ctx, W, H) {
    const { left, right, top, bottom } = this.margins;
    const pw = W - left - right;
    const ph = H - top - bottom;

    ctx.strokeStyle = 'rgba(120, 150, 220, 0.6)';
    ctx.lineWidth = 1;

    // Plot border
    ctx.strokeRect(left, top, pw, ph);

    ctx.fillStyle = '#a0b8ee';
    ctx.font = '12px "JetBrains Mono", monospace';

    // X axis ticks and labels
    for (let lp = Math.ceil(this.xMin); lp <= Math.floor(this.xMax); lp++) {
      const { x } = this.toScreen(lp, 0);
      ctx.strokeStyle = 'rgba(120, 150, 220, 0.5)';
      ctx.beginPath(); ctx.moveTo(x, top + ph); ctx.lineTo(x, top + ph + 5); ctx.stroke();
      const label = lp < 0 ? `10⁻${Math.abs(lp)}` : (lp === 0 ? '1' : `10${lp}`);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8099cc';
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillText(logLabel(lp), x, top + ph + 18);
    }

    // Y axis ticks and labels
    for (let lpdot = Math.ceil(this.yMin); lpdot <= Math.floor(this.yMax); lpdot++) {
      const { y } = this.toScreen(0, lpdot);
      ctx.strokeStyle = 'rgba(120, 150, 220, 0.5)';
      ctx.beginPath(); ctx.moveTo(left - 5, y); ctx.lineTo(left, y); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8099cc';
      ctx.font = '11px "Space Grotesk", sans-serif';
      ctx.fillText(logLabel(lpdot), left - 8, y + 4);
    }

    // X axis title
    ctx.fillStyle = '#c0d0f0';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Spin Period  P₀  (s)', left + pw / 2, H - 8);

    // Y axis title
    ctx.save();
    ctx.translate(15, top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Period Derivative  Ṗ  (s s⁻¹)', 0, 0);
    ctx.restore();
  }

  // ── Legend ───────────────────────────────────────────────────────────────────
  _drawLegend(ctx, W, H) {
    const { right, top } = this.margins;
    const lx = W - right + 12;
    const ly = top + 20;
    const lineH = 18;

    ctx.font = '11px "Space Grotesk", sans-serif';

    const visible = Object.keys(CLS_COLORS).filter(cls =>
      this.stars.some(s => s.ns_class === cls)
    );

    visible.forEach((cls, i) => {
      const y = ly + i * lineH;
      ctx.beginPath();
      ctx.arc(lx + 6, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = CLS_COLORS[cls];
      ctx.fill();
      ctx.fillStyle = '#8099cc';
      ctx.textAlign = 'left';
      ctx.fillText(CLS_LABEL[cls], lx + 14, y + 4);
    });

    // Death line indicator
    const iy = ly + visible.length * lineH + 10;
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 80, 40, 0.70)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx, iy); ctx.lineTo(lx + 20, iy); ctx.stroke();
    ctx.fillStyle = '#cc6644';
    ctx.textAlign = 'left';
    ctx.fillText('Death line', lx + 24, iy + 4);
  }

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  _drawTooltip(ctx, star, W, H) {
    const logP    = Math.log10(star.p0);
    const logPdot = Math.log10(star.p1);
    const { x, y } = this.toScreen(logP, logPdot);

    const lines = [
      star.jname,
      CLS_LABEL[star.ns_class] || star.ns_class,
      `P₀ = ${(star.p0 * 1000).toFixed(3)} ms`,
      `Ṗ = ${star.p1.toExponential(2)}`,
      star.bsurf_g ? `B = ${star.bsurf_g.toExponential(2)} G` : null,
      star.age_yr  ? `τ = ${fmtAge(star.age_yr)}` : null,
    ].filter(Boolean);

    const pad = 8;
    const lh  = 16;
    const tw  = 170;
    const th  = lines.length * lh + pad * 2;

    let tx = x + 14;
    let ty = y - th / 2;
    if (tx + tw > W - 10) tx = x - tw - 14;
    if (ty < 4) ty = 4;
    if (ty + th > H - 4) ty = H - th - 4;

    ctx.fillStyle = 'rgba(5, 8, 22, 0.92)';
    ctx.strokeStyle = 'rgba(100, 140, 255, 0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, tx, ty, tw, th, 5);
    ctx.fill(); ctx.stroke();

    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? '#e8eeff'
        : i === 1 ? (CLS_COLORS[star.ns_class] || '#aabbdd')
        : '#8099bb';
      ctx.font = i < 2
        ? `${i === 0 ? 600 : 400} 12px "Space Grotesk", sans-serif`
        : '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(line, tx + pad, ty + pad + 12 + i * lh);
    });
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  _setupEvents() {
    const c = this.canvas;

    c.addEventListener('mousemove', e => {
      const { logP, logPdot } = this.toData(e.offsetX, e.offsetY);
      this.hovered = this._findNearestStar(logP, logPdot, e.offsetX, e.offsetY, 14);
      this.render();
    });

    c.addEventListener('mouseleave', () => {
      this.hovered = null;
      this.render();
    });

    c.addEventListener('click', e => {
      const { logP, logPdot } = this.toData(e.offsetX, e.offsetY);
      const star = this._findNearestStar(logP, logPdot, e.offsetX, e.offsetY, 20);
      if (star && this.onClickStar) {
        this.highlighted = star.jname;
        this.onClickStar(star);
        this.render();
      }
    });

    // Zoom with scroll
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const { logP, logPdot } = this.toData(e.offsetX, e.offsetY);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const dxMin = (this.xMin - logP) * factor;
      const dxMax = (this.xMax - logP) * factor;
      const dyMin = (this.yMin - logPdot) * factor;
      const dyMax = (this.yMax - logPdot) * factor;
      const minW = 0.8, maxW = 8;
      if (Math.abs(dxMax - dxMin) < minW || Math.abs(dxMax - dxMin) > maxW) return;
      this.xMin = logP + dxMin;
      this.xMax = logP + dxMax;
      this.yMin = logPdot + dyMin;
      this.yMax = logPdot + dyMax;
      this.render();
    }, { passive: false });

    // Pan with drag
    c.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this._drag = {
        sx: e.offsetX, sy: e.offsetY,
        xMin: this.xMin, xMax: this.xMax,
        yMin: this.yMin, yMax: this.yMax,
      };
      c.style.cursor = 'grabbing';
    });

    c.addEventListener('mousemove', e => {
      if (!this._drag) return;
      const { left, right, top, bottom } = this.margins;
      const pw = this.canvas.width  - left - right;
      const ph = this.canvas.height - top  - bottom;
      const dx = (e.offsetX - this._drag.sx) / pw * (this._drag.xMax - this._drag.xMin);
      const dy = (e.offsetY - this._drag.sy) / ph * (this._drag.yMax - this._drag.yMin);
      this.xMin = this._drag.xMin - dx;
      this.xMax = this._drag.xMax - dx;
      this.yMin = this._drag.yMin + dy;
      this.yMax = this._drag.yMax + dy;
      this.render();
    });

    c.addEventListener('mouseup', () => {
      this._drag = null;
      c.style.cursor = 'crosshair';
    });

    // Double-click to reset zoom
    c.addEventListener('dblclick', () => {
      this.xMin = -3.2; this.xMax = 2.2;
      this.yMin = -22.5; this.yMax = -8.0;
      this.render();
    });
  }

  // ── Nearest star lookup ──────────────────────────────────────────────────────
  _findNearestStar(logP, logPdot, sx, sy, maxPx) {
    let best = null;
    let bestDist = Infinity;

    for (const s of this.stars) {
      const lp = Math.log10(s.p0);
      const lpd = Math.log10(s.p1);
      if (lp < this.xMin || lp > this.xMax) continue;
      if (lpd < this.yMin || lpd > this.yMax) continue;
      const { x, y } = this.toScreen(lp, lpd);
      const d = Math.hypot(x - sx, y - sy);
      if (d < maxPx && d < bestDist) { bestDist = d; best = s; }
    }
    return best;
  }

  // ── Resize ───────────────────────────────────────────────────────────────────
  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
    this.render();
  }

  destroy() {
    // Event listeners are on canvas; removing canvas removes them
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function logLabel(exp) {
  if (exp === 0) return '1';
  const supMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
  const sup = String(Math.abs(exp)).split('').map(c => supMap[c] || c).join('');
  return exp < 0 ? `10⁻${sup}` : `10${sup}`;
}

function fmtAge(yr) {
  if (yr >= 1e9) return `${(yr / 1e9).toFixed(1)} Gyr`;
  if (yr >= 1e6) return `${(yr / 1e6).toFixed(1)} Myr`;
  if (yr >= 1e3) return `${(yr / 1e3).toFixed(0)} kyr`;
  return `${yr.toFixed(0)} yr`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
