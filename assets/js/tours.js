/**
 * Pulsar Galaxy Explorer — Cinematic Tour Engine
 * Four scripted tours with timed camera paths, narration, and star cross-linking
 */
import * as THREE from 'three';

// ── Easing helpers ────────────────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ── Tour definitions ──────────────────────────────────────────────────────────
export const TOUR_DEFS = [
  {
    id: 'firstPulsar',
    name: 'The First Pulsar',
    tagline: 'A signal from the dark',
    description: 'Follow the 1967 discovery that shook astronomy. A PhD student noticed a strange, clockwork pulse from an unknown source — and changed our picture of the universe forever.',
    icon: '📻',
    color: '#4488ff',
    duration: 78,
    steps: [
      {
        t: 0,
        camPos: [0, 40, 72],
        camLookAt: [0, 0, 0],
        narration: 'The Milky Way.',
        subtext: 'Over four thousand neutron stars are hidden across this spiral — relics of stellar death. But in 1967, we knew of none.',
        starJname: null,
      },
      {
        t: 11,
        camPos: [-18, 22, 55],
        camLookAt: [0, 0, 0],
        narration: 'November 28, 1967. Cambridge, England.',
        subtext: 'PhD student Jocelyn Bell was reviewing chart paper from the Interplanetary Scintillation Array — a radio telescope she had helped build.',
        starJname: null,
      },
      {
        t: 23,
        camPos: [14, 8, 10],
        camLookAt: [8.5, 0, 0],
        narration: 'She found a peculiar signal.',
        subtext: 'A pulse of radio waves, arriving with clockwork precision every 1.3373 seconds. Perfectly regular. Impossibly precise. Like a cosmic heartbeat.',
        starJname: null,
      },
      {
        t: 36,
        camPos: [9.5, 2.0, 2.0],
        camLookAt: [8.33, 0.02, 0.25],
        narration: 'Her supervisor called it "LGM-1" — Little Green Men.',
        subtext: 'Could this be an alien beacon? A civilisation announcing itself across the stars? The source was just 300 light-years away.',
        starJname: 'J1921+2153',
      },
      {
        t: 50,
        camPos: [8.65, 0.4, 1.1],
        camLookAt: [8.33, 0.02, 0.25],
        narration: 'It wasn\'t aliens.',
        subtext: 'It was a rotating neutron star — a stellar corpse the size of a city, spinning 0.75 times per second and sweeping a beam of radio waves across the galaxy like a lighthouse.',
        starJname: 'J1921+2153',
      },
      {
        t: 64,
        camPos: [13, 7, 12],
        camLookAt: [8.33, 0.02, 0.25],
        narration: 'PSR J1921+2153. The first pulsar ever discovered.',
        subtext: 'The Nobel Prize was awarded in 1974 — to Bell\'s supervisor. She was not included. Today, over 4,000 pulsars are known. But this modest dot started it all.',
        starJname: null,
      },
    ],
  },

  {
    id: 'fastestSpinner',
    name: 'Fastest Spinner',
    tagline: 'The dead star reborn',
    description: 'A neutron star once destined to fade quietly into darkness was given a second life — spun up to 716 rotations per second by a companion star. Meet the fastest-spinning object ever measured.',
    icon: '⚡',
    color: '#ffd700',
    duration: 76,
    steps: [
      {
        t: 0,
        camPos: [0, 40, 72],
        camLookAt: [0, 0, 0],
        narration: 'Somewhere in this galaxy spins a neutron star moving faster than anything else in the known universe.',
        subtext: 'Not born this way. This is a story of transformation — of death and unlikely resurrection.',
        starJname: null,
      },
      {
        t: 11,
        camPos: [12, 18, 30],
        camLookAt: [0, 0, 0],
        narration: 'When a neutron star forms in a supernova, it typically spins once every second or so.',
        subtext: 'Over millions of years, it slows down — spinning away energy as radio waves and magnetic winds. A pulsar slowly dying.',
        starJname: null,
      },
      {
        t: 23,
        camPos: [6, 8, 15],
        camLookAt: [1.90, 0.19, 0.44],
        narration: 'But some pulsars are not alone.',
        subtext: 'If a companion star evolves and overflows its Roche lobe, mass falls onto the neutron star. Each kilogram carries angular momentum. The spin rate climbs.',
        starJname: null,
      },
      {
        t: 36,
        camPos: [3.8, 1.8, 3.2],
        camLookAt: [1.90, 0.19, 0.44],
        narration: 'Terzan 5. A globular cluster near the galactic bulge.',
        subtext: 'Dense with ancient stars — and hidden within it, something extraordinary. The fastest natural spinner ever measured.',
        starJname: 'J1748-2446ad',
      },
      {
        t: 49,
        camPos: [2.3, 0.7, 1.5],
        camLookAt: [1.90, 0.19, 0.44],
        narration: 'PSR J1748-2446ad. 716 rotations per second.',
        subtext: 'Its equator moves at 24% the speed of light. It completes a full rotation before light travels 420 kilometres. At this speed, any less dense object would tear itself apart.',
        starJname: 'J1748-2446ad',
      },
      {
        t: 63,
        camPos: [10, 15, 22],
        camLookAt: [1.90, 0.19, 0.44],
        narration: 'A dead star, resurrected by stolen momentum.',
        subtext: 'Millisecond pulsars like this are the most precise natural clocks in the universe — stable to one part in 10²⁰ over decades. More regular than atomic clocks on Earth.',
        starJname: null,
      },
    ],
  },

  {
    id: 'magnetarMayhem',
    name: 'Magnetar Mayhem',
    tagline: 'The most magnetic objects in the universe',
    description: 'Ordinary neutron stars have extraordinary magnetic fields. Magnetars take it a thousand times further — fields so intense that the vacuum itself is distorted. One of them nearly blinded our satellites in 2004.',
    icon: '🔴',
    color: '#ff2244',
    duration: 80,
    steps: [
      {
        t: 0,
        camPos: [0, 40, 72],
        camLookAt: [0, 0, 0],
        narration: 'Every red point of light you see is a magnetar.',
        subtext: 'Ordinary neutron stars have magnetic fields of 10¹² Gauss — a trillion times Earth\'s field. Magnetars have fields one thousand times stronger still.',
        starJname: null,
      },
      {
        t: 12,
        camPos: [0, 12, 30],
        camLookAt: [0, 0, 0],
        narration: 'Fields so intense that the structure of atoms is distorted.',
        subtext: 'Electrons become confined to one-dimensional motion along field lines. The vacuum itself becomes birefringent — it rotates the polarisation of passing light. Empty space, made strange.',
        starJname: null,
      },
      {
        t: 24,
        camPos: [-1.5, 4.5, 7.0],
        camLookAt: [-4.30, -0.05, 2.26],
        narration: 'December 27, 2004.',
        subtext: 'A wave of energy swept across the solar system. It saturated gamma-ray detectors on six different spacecraft simultaneously — from inside our own magnetosphere to the orbit of Mars.',
        starJname: null,
      },
      {
        t: 38,
        camPos: [-3.2, 1.0, 4.0],
        camLookAt: [-4.30, -0.05, 2.26],
        narration: 'The source: SGR 1806-20. 50,000 light-years away.',
        subtext: 'In just 0.2 seconds, this magnetar released more energy than our Sun will emit in the next 250,000 years. The burst briefly ionised Earth\'s upper atmosphere — from across the galaxy.',
        starJname: 'J1808-2024',
      },
      {
        t: 52,
        camPos: [4.5, 2.0, 4.5],
        camLookAt: [3.85, -0.01, 1.23],
        narration: 'Magnetars are also the prime suspects for Fast Radio Bursts.',
        subtext: 'Millisecond flashes of radio energy, visible across billions of light-years. A single FRB can outshine an entire galaxy for a fraction of a second. We now detect hundreds per day.',
        starJname: 'J1818-1607',
      },
      {
        t: 66,
        camPos: [0, 28, 50],
        camLookAt: [0, 0, 0],
        narration: 'Only ~30 confirmed magnetars exist in our galaxy.',
        subtext: 'Each one is a catastrophe, scaled to the cosmos. Their extreme fields decay in just thousands of years — brief and violent lives, even by stellar standards.',
        starJname: null,
      },
    ],
  },

  {
    id: 'theGraveyard',
    name: 'The Graveyard',
    tagline: 'Where pulsars go to die',
    description: 'Every pulsar is dying. With each rotation, energy bleeds away into the cosmos. Over billions of years, the spin slows, the field weakens, and the lighthouse goes dark. The graveyard is vast — and invisible.',
    icon: '💀',
    color: '#aa44ff',
    duration: 78,
    steps: [
      {
        t: 0,
        camPos: [0, 40, 72],
        camLookAt: [0, 0, 0],
        narration: 'Every pulsar you see is dying.',
        subtext: 'With each rotation, magnetic dipole radiation carries away angular momentum. The spin slows — by nanoseconds per day at first, but relentlessly, irreversibly.',
        starJname: null,
      },
      {
        t: 11,
        camPos: [-20, 18, 52],
        camLookAt: [0, 0, 0],
        narration: 'A pulsar\'s life is measured in the spin-down timescale: P / (2 Ṗ).',
        subtext: 'Young pulsars like the Crab spin fast and slow down quickly — a characteristic age of only a thousand years. Old pulsars crawl, almost imperceptible in their decline.',
        starJname: null,
      },
      {
        t: 24,
        camPos: [5.5, 8, 12],
        camLookAt: [5.52, 0.28, -1.68],
        narration: 'Eventually, every pulsar crosses the death line.',
        subtext: 'Below a critical combination of spin period and field strength, the electromagnetic engine fails. Radio emission ceases. The neutron star falls silent — invisible to every telescope on Earth.',
        starJname: null,
      },
      {
        t: 38,
        camPos: [6.2, 1.2, 0.8],
        camLookAt: [5.52, 0.28, -1.68],
        narration: 'PSR J1548-4821. Age: 20 billion years.',
        subtext: 'Older than the solar system. Older than most stars in the sky. Still detectable — just barely — a pulsar teetering on the edge of the graveyard.',
        starJname: 'J1548-4821',
      },
      {
        t: 52,
        camPos: [0, 55, 85],
        camLookAt: [0, 0, 0],
        narration: 'For every pulsar we can see, hundreds of billions have already gone dark.',
        subtext: 'Cold, dense, spinning slowly in the dark. They pass through molecular clouds, through stellar nurseries, through the space between stars — utterly invisible.',
        starJname: null,
      },
      {
        t: 66,
        camPos: [-35, 25, 62],
        camLookAt: [0, 0, 0],
        narration: 'The graveyard is vast.',
        subtext: 'We just cannot see it. Every beam of light that passes through this galaxy travels through an ocean of dead neutron stars — silent monuments to stellar catastrophe, waiting in the dark.',
        starJname: null,
      },
    ],
  },
];

// ── Tour Engine ───────────────────────────────────────────────────────────────
export class TourEngine {
  constructor(camera, controls) {
    this.camera   = camera;
    this.controls = controls;
    this.active   = false;
    this.paused   = false;

    this._tour        = null;
    this._tourTime    = 0;
    this._stepIdx     = -1;
    this._callbacks   = {};

    // Working vectors (avoid GC churn)
    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._vt = new THREE.Vector3();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  start(tourId, starIndexMap, callbacks = {}) {
    const def = TOUR_DEFS.find(t => t.id === tourId);
    if (!def) return;

    this._tour      = def;
    this._tourTime  = 0;
    this._stepIdx   = -1;
    this._callbacks = callbacks;
    this._starMap   = starIndexMap;
    this.active     = true;
    this.paused     = false;

    this.controls.enabled = false;

    // Jump camera to first step immediately
    const s0 = def.steps[0];
    this.camera.position.set(...s0.camPos);
    this.controls.target.set(...s0.camLookAt);
    this.camera.lookAt(...s0.camLookAt);

    this._fireStep(0);
    if (callbacks.onStart) callbacks.onStart(def);
  }

  stop() {
    if (!this.active) return;
    this.active  = false;
    this.paused  = false;
    this._tour   = null;
    this.controls.enabled = true;
    if (this._callbacks.onComplete) this._callbacks.onComplete();
  }

  pause()  { this.paused = true; }
  resume() { this.paused = false; }

  skip() {
    if (!this.active || !this._tour) return;
    const steps = this._tour.steps;
    const nextIdx = this._stepIdx + 1;
    if (nextIdx >= steps.length) { this.stop(); return; }
    this._tourTime = steps[nextIdx].t + 0.01;
  }

  // ── Frame update ────────────────────────────────────────────────────────────
  tick(delta) {
    if (!this.active || this.paused || !this._tour) return;

    const steps = this._tour.steps;
    this._tourTime += delta;

    // End of tour
    if (this._tourTime >= this._tour.duration) {
      this.stop();
      return;
    }

    // Fire narration for newly-reached steps
    for (let i = 0; i < steps.length; i++) {
      if (i > this._stepIdx && this._tourTime >= steps[i].t) {
        this._fireStep(i);
      }
    }

    // Camera interpolation: find surrounding steps
    const curIdx  = this._currentStepIdx();
    const nextIdx = curIdx + 1;

    if (curIdx < 0 || !steps[curIdx].camPos) return;

    if (nextIdx >= steps.length || !steps[nextIdx].camPos) {
      // Stay at final position
      this.camera.position.set(...steps[curIdx].camPos);
      this.controls.target.set(...steps[curIdx].camLookAt);
      this.camera.lookAt(...steps[curIdx].camLookAt);
      return;
    }

    const stepStart = steps[curIdx].t;
    const stepEnd   = steps[nextIdx].t;
    const raw = (this._tourTime - stepStart) / (stepEnd - stepStart);
    const t   = Math.min(1, Math.max(0, raw));
    const ease = easeInOutSine(t);

    // Lerp camera position
    this._v0.set(...steps[curIdx].camPos);
    this._v1.set(...steps[nextIdx].camPos);
    this._vt.lerpVectors(this._v0, this._v1, ease);
    this.camera.position.copy(this._vt);

    // Lerp lookAt target
    this._v0.set(...steps[curIdx].camLookAt);
    this._v1.set(...steps[nextIdx].camLookAt);
    this._vt.lerpVectors(this._v0, this._v1, ease);
    this.controls.target.copy(this._vt);
    this.camera.lookAt(this._vt);

    // Progress callback
    if (this._callbacks.onProgress) {
      this._callbacks.onProgress(this._tourTime / this._tour.duration, this._tourTime);
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────
  _currentStepIdx() {
    const steps = this._tour.steps;
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (this._tourTime >= steps[i].t) idx = i;
    }
    return idx;
  }

  _fireStep(i) {
    this._stepIdx = i;
    const step = this._tour.steps[i];

    // Narration
    if (this._callbacks.onNarration) {
      this._callbacks.onNarration(step.narration, step.subtext || '');
    }

    // Star highlight
    if (step.starJname && this._starMap) {
      const star = this._starMap.get(step.starJname);
      if (star && this._callbacks.selectStar) {
        this._callbacks.selectStar(star);
      }
    } else if (this._callbacks.deselectStar) {
      this._callbacks.deselectStar();
    }
  }
}
