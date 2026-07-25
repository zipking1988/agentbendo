/**
 * Synthetic Wi‑Fi CSI field for visualization demos.
 *
 * Not real hardware CSI. Generators follow RF-inspired structure:
 * multipath fading envelope, subcarrier phase wrapping, Doppler-ish
 * motion energy, and slow micro-motion when still.
 *
 * Never present as live sensing or clinical vitals.
 */

export type CareStatus = "normal" | "warning" | "critical";

export type CsiSimInput = {
  /** 0–1 motion intensity from demo frames */
  motionLevel: number;
  /** seconds of stillness */
  stillDuration: number;
  anomalyScore: number;
  status: CareStatus;
  /** story time in seconds — seeds temporal evolution */
  t: number;
  /** presence on plan 0–100 */
  presenceX: number;
  presenceY: number;
  wifiX: number;
  wifiY: number;
};

export type CsiSimSample = {
  /** Mean amplitude 0–1 (maps to hue / brightness) */
  amplitude: number;
  /** Per-subcarrier amplitude 0–1 */
  subcarrierAmp: Float32Array;
  /** Per-subcarrier phase radians −π…π */
  subcarrierPhase: Float32Array;
  /** Instantaneous motion energy 0–1 → particle density */
  motionEnergy: number;
  /** Slow micro-motion / stillness rhythm 0–1 → halo pulse (not a medical vital) */
  microMotion: number;
  /** Path loss–ish distance factor wifi→presence 0–1 */
  pathCoupling: number;
};

const SUBCARRIERS = 52;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Smooth multipath envelope — Rician-ish when quiet, Rayleigh-ish when moving. */
function fadingEnvelope(t: number, motion: number, k: number): number {
  const specular = Math.cos(t * (0.7 + motion * 2.4) + k * 0.31);
  const scatter =
    Math.sin(t * (1.9 + motion * 5.1) + k * 1.7) * 0.55 +
    Math.sin(t * (3.3 + motion * 2.2) + k * 0.9) * 0.35;
  const mix = clamp01(0.25 + motion * 0.7);
  const env = (1 - mix) * (0.72 + 0.28 * specular) + mix * (0.45 + 0.55 * Math.abs(scatter));
  return clamp01(env);
}

/**
 * Build one CSI-like sample from demo sensing features.
 * Deterministic for a given input (good for tests / replay sync).
 */
export function simulateCsi(input: CsiSimInput): CsiSimSample {
  const motion = clamp01(input.motionLevel);
  const anomaly = clamp01(input.anomalyScore);
  const still = Math.max(0, input.stillDuration);
  const t = input.t;

  const dx = (input.presenceX - input.wifiX) / 100;
  const dy = (input.presenceY - input.wifiY) / 100;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Free-space–ish coupling: closer → stronger path
  const pathCoupling = clamp01(1 - dist * 1.15);

  // Motion energy: kinetic + anomaly burst (multipath churn)
  const motionEnergy = clamp01(motion * 0.75 + anomaly * 0.35 + (motion > 0.15 ? 0.08 : 0));

  // Micro-motion: breathing-scale oscillation when still (demo only — not vitals)
  const quiet = clamp01(1 - motion * 2.2);
  const breathHz = 0.22 + (still > 120 ? 0.04 : 0); // slightly slower if long stillness
  const microMotion = quiet * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * breathHz)));

  const amp = new Float32Array(SUBCARRIERS);
  const phase = new Float32Array(SUBCARRIERS);
  let ampSum = 0;

  // Status tilts the band: warning/critical deepen nulls (path disruption cue)
  const statusTilt =
    input.status === "critical" ? 0.22 : input.status === "warning" ? 0.12 : 0;

  for (let k = 0; k < SUBCARRIERS; k++) {
    const freq = k / SUBCARRIERS;
    const fade = fadingEnvelope(t, motionEnergy, k + 1);
    // Frequency-selective notch near mid-band when anomalous
    const notch = 1 - anomaly * 0.55 * Math.exp(-Math.pow((freq - 0.48) / 0.12, 2));
    const path = 0.35 + 0.65 * pathCoupling;
    const a = clamp01(fade * notch * path * (0.85 + 0.15 * hash(k * 17.3 + Math.floor(t))) - statusTilt * (0.5 + freq));
    amp[k] = a;
    ampSum += a;

    // Phase: geometric delay + Doppler-ish drift from motion energy
    const delay = pathCoupling * Math.PI * (0.4 + freq * 1.6);
    const doppler = t * (0.35 + motionEnergy * 4.2) * (0.5 + freq);
    const wrap = delay + doppler + microMotion * 0.35 * Math.sin(freq * 8);
    phase[k] = ((wrap + Math.PI) % (Math.PI * 2)) - Math.PI;
  }

  const amplitude = clamp01(ampSum / SUBCARRIERS);

  return {
    amplitude,
    subcarrierAmp: amp,
    subcarrierPhase: phase,
    motionEnergy,
    microMotion,
    pathCoupling,
  };
}

export function amplitudeToColor(
  amp: number,
  status: CareStatus,
): { r: number; g: number; b: number } {
  // Agent Bento: deep forest → lime (normal), amber, coral — no purple
  const a = clamp01(amp);
  if (status === "critical") {
    return {
      r: Math.round(40 + a * 215),
      g: Math.round(20 + a * 80),
      b: Math.round(24 + a * 40),
    };
  }
  if (status === "warning") {
    return {
      r: Math.round(40 + a * 215),
      g: Math.round(50 + a * 140),
      b: Math.round(20 + a * 50),
    };
  }
  return {
    r: Math.round(12 + a * 100),
    g: Math.round(40 + a * 200),
    b: Math.round(30 + a * 70),
  };
}

export const CSI_SUBCARRIER_COUNT = SUBCARRIERS;
