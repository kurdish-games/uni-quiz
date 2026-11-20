/**
 * Cozy Flowing Silk-Wave Background (Zero Dots / Zero Circles!)
 * - Clearly visible, lush multi-layered flowing liquid ribbons
 * - Smoothly bends, ripples, and reacts to cursor / touch movement
 * - Reactive cozy color moods per subject & answer reveal
 */

const MOOD_PALETTES = {
  home:       { a: [232, 146, 98],  b: [118, 168, 232], c: [188, 122, 168], bgTop: '#111017', bgBot: '#181420' },
  psychology: { a: [104, 174, 238], b: [142, 212, 198], c: [170, 140, 224], bgTop: '#0e131c', bgBot: '#141a28' },
  morphology: { a: [238, 158, 102], b: [232, 196, 124], c: [204, 118, 134], bgTop: '#161114', bgBot: '#1e161b' },
  mixed:      { a: [176, 146, 238], b: [236, 156, 112], c: [118, 196, 224], bgTop: '#12111b', bgBot: '#191625' },
  correct:    { a: [94, 214, 158],  b: [146, 226, 190], c: [232, 198, 124], bgTop: '#0e1715', bgBot: '#13201c' },
  wrong:      { a: [228, 108, 118], b: [198, 124, 154], c: [148, 116, 168], bgTop: '#191014', bgBot: '#21141a' },
};

class CozyWaveBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.time = 0;

    // Smooth cursor tracking in pixel & normalized space
    this.cursor = {
      x: this.width * 0.5,
      y: this.height * 0.5,
      tx: this.width * 0.5,
      ty: this.height * 0.5,
      vx: 0,
      vy: 0,
      active: 0, // fades up when user moves mouse/finger
    };

    // Wave energy boost (pulses softly on correct answers!)
    this.energy = 0;

    this.cur = clonePal(MOOD_PALETTES.home);
    this.tgt = clonePal(MOOD_PALETTES.home);

    this._resize();
    this._bindEvents();
    this._loop();
  }

  _resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _bindEvents() {
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => this._resize(), 120);
    });

    const onMove = (x, y) => {
      this.cursor.tx = x;
      this.cursor.ty = y;
      this.cursor.active = 1;
    };

    window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  setMood(key) {
    this.tgt = clonePal(MOOD_PALETTES[key] || MOOD_PALETTES.home);
  }

  pulseWave(strength = 1) {
    this.energy = Math.min(2.2, this.energy + strength);
  }

  _lerpPalette() {
    const s = 0.03;
    ['a', 'b', 'c'].forEach((k) => {
      for (let i = 0; i < 3; i++) {
        this.cur[k][i] += (this.tgt[k][i] - this.cur[k][i]) * s;
      }
    });
  }

  _drawMeshGlow() {
    const { ctx, width, height, cursor } = this;
    const [ar, ag, ab] = this.cur.a.map(Math.round);
    const [br, bg, bb] = this.cur.b.map(Math.round);
    const [cr, cg, cb] = this.cur.c.map(Math.round);

    // Broad warm ambient corner wash (top-left)
    const g1 = ctx.createRadialGradient(
      width * 0.18 + (cursor.x - width * 0.5) * 0.14,
      height * 0.22 + (cursor.y - height * 0.5) * 0.14,
      0,
      width * 0.18,
      height * 0.22,
      Math.max(width, height) * 0.72
    );
    g1.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.24)`);
    g1.addColorStop(0.55, `rgba(${ar}, ${ag}, ${ab}, 0.07)`);
    g1.addColorStop(1, 'rgba(17, 16, 23, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    // Second warm ambient wash (bottom-right)
    const g2 = ctx.createRadialGradient(
      width * 0.84 - (cursor.x - width * 0.5) * 0.12,
      height * 0.78 - (cursor.y - height * 0.5) * 0.12,
      0,
      width * 0.84,
      height * 0.78,
      Math.max(width, height) * 0.68
    );
    g2.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, 0.22)`);
    g2.addColorStop(0.55, `rgba(${cr}, ${cg}, ${cb}, 0.08)`);
    g2.addColorStop(1, 'rgba(17, 16, 23, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);

    // Soft diffused cursor light wash (NO hard circle edge!)
    const gCursor = ctx.createRadialGradient(
      cursor.x,
      cursor.y,
      0,
      cursor.x,
      cursor.y,
      Math.max(width, height) * 0.42
    );
    gCursor.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${0.14 + this.energy * 0.05})`);
    gCursor.addColorStop(0.45, `rgba(${br}, ${bg}, ${bb}, 0.05)`);
    gCursor.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gCursor;
    ctx.fillRect(0, 0, width, height);
  }

  _drawSilkRibbons() {
    const { ctx, width, height, time, cursor } = this;
    const [ar, ag, ab] = this.cur.a.map(Math.round);
    const [br, bg, bb] = this.cur.b.map(Math.round);
    const [cr, cg, cb] = this.cur.c.map(Math.round);

    const nx = cursor.x / Math.max(1, width) - 0.5;  // -0.5 .. 0.5
    const ny = cursor.y / Math.max(1, height) - 0.5;

    const ribbons = [
      { yPct: 0.30, amp: 58, freq: 0.0022, speed: 0.52,  thick: 150, col: `${cr},${cg},${cb}`, fillA: 0.16, lineA: 0.34, pull: 85 },
      { yPct: 0.46, amp: 66, freq: 0.0026, speed: -0.42, thick: 170, col: `${ar},${ag},${ab}`, fillA: 0.22, lineA: 0.50, pull: 115 },
      { yPct: 0.58, amp: 54, freq: 0.0031, speed: 0.62,  thick: 145, col: `${br},${bg},${bb}`, fillA: 0.21, lineA: 0.48, pull: 105 },
      { yPct: 0.72, amp: 62, freq: 0.0020, speed: -0.36, thick: 185, col: `${ar},${ag},${ab}`, fillA: 0.17, lineA: 0.36, pull: 90 },
      { yPct: 0.84, amp: 48, freq: 0.0028, speed: 0.46,  thick: 140, col: `${cr},${cg},${cb}`, fillA: 0.14, lineA: 0.30, pull: 70 },
    ];

    const stepX = Math.max(18, Math.floor(width / 56));
    const energyBoost = 1 + this.energy * 0.32;

    ribbons.forEach((r, idx) => {
      const baseY = height * r.yPct + ny * r.pull;
      const topPts = [];

      ctx.beginPath();
      for (let x = -stepX; x <= width + stepX; x += stepX) {
        // Cursor magnetic bend: waves smoothly bow toward the cursor horizontally & vertically!
        const dx = x - cursor.x;
        const distFactor = Math.exp(-(dx * dx) / (width * width * 0.095));
        const cursorBend = (cursor.y - baseY) * 0.26 * distFactor;

        const wave1 = Math.sin(x * r.freq + time * r.speed + idx * 1.3 + nx * 1.4) * r.amp * energyBoost;
        const wave2 = Math.cos(x * r.freq * 0.58 - time * r.speed * 0.75 + idx) * (r.amp * 0.42);
        const y = baseY + wave1 + wave2 + cursorBend;

        topPts.push({ x, y });
        if (x === -stepX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Return along lower ribbon edge
      for (let i = topPts.length - 1; i >= 0; i--) {
        const pt = topPts[i];
        const pinch = 0.62 + 0.38 * Math.sin(pt.x * 0.0034 + time * 0.55 + idx * 1.7);
        ctx.lineTo(pt.x, pt.y + r.thick * pinch);
      }
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, baseY - r.amp, 0, baseY + r.thick + r.amp);
      grad.addColorStop(0, `rgba(${r.col}, ${r.fillA})`);
      grad.addColorStop(0.45, `rgba(${r.col}, ${r.fillA * 0.45})`);
      grad.addColorStop(1, `rgba(${r.col}, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Luminous silk crest edge
      ctx.beginPath();
      topPts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = `rgba(${r.col}, ${r.lineA})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });
  }

  _loop() {
    this.time += 0.024;
    this.energy *= 0.965;

    // Silky spring follow on cursor
    const dx = this.cursor.tx - this.cursor.x;
    const dy = this.cursor.ty - this.cursor.y;
    this.cursor.x += dx * 0.08;
    this.cursor.y += dy * 0.08;

    this._lerpPalette();

    // Rich warm charcoal-slate base
    const baseGrad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    baseGrad.addColorStop(0, '#100f16');
    baseGrad.addColorStop(0.5, '#15131f');
    baseGrad.addColorStop(1, '#12151f');
    this.ctx.fillStyle = baseGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this._drawMeshGlow();
    this._drawSilkRibbons();

    requestAnimationFrame(() => this._loop());
  }
}

function clonePal(p) {
  return { a: [...p.a], b: [...p.b], c: [...p.c] };
}

export function initBackground() {
  return new CozyWaveBackground('ps5-bg-canvas');
}
