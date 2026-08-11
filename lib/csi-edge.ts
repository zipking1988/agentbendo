/** Privacy-safe CSI preprocessing that runs locally before GMI Cloud inference. */

export type RawCsiFrame = {
  timestamp: number;
  rawAmplitude: number[];
  rawPhase: number[];
  rssi?: number;
  deviceId?: string;
};

export type ProcessedCsiFrame = {
  timestamp: number;
  amplitude: number[];
  phase: number[];
  fftSpectrum: number[];
  breathingEnergy: number;
  heartEnergy: number;
  snr: number;
  denoiseConfidence: number;
};

export type EdgeResult = {
  processedFrames: ProcessedCsiFrame[];
  screening: {
    motionDetected: boolean;
    motionLevel: number;
    stillDurationSec: number;
    confidence: number;
    latencyMs: number;
    needsCloudInference: boolean;
    edgeAlert: "none" | "watch" | "alert";
  };
  cloudPayload: {
    features: number[];
    motionStats: { mean: number; variance: number; peak: number };
    breathingRate?: number;
    heartRate?: number;
    snr: number;
  };
  processingMs: number;
  localOnly: true;
};

export async function processOnDevice(rawFrames: RawCsiFrame[]): Promise<EdgeResult> {
  const started = Date.now();
  const processedFrames = rawFrames.map((frame) => {
    const amplitude = movingAverage(frame.rawAmplitude, 3);
    const phase = unwrapPhase(frame.rawPhase);
    const fftSpectrum = simpleSpectrum(amplitude);
    const signal = variance(amplitude);
    const noise = Math.max(0.001, variance(frame.rawAmplitude.map((v, i) => v - (amplitude[i] ?? v))));
    const snr = 10 * Math.log10(Math.max(0.001, signal) / noise);
    return {
      timestamp: frame.timestamp,
      amplitude,
      phase,
      fftSpectrum,
      breathingEnergy: sumSquares(fftSpectrum.slice(1, 6)),
      heartEnergy: sumSquares(fftSpectrum.slice(8, 21)),
      snr: round3(snr),
      denoiseConfidence: clamp01((snr + 10) / 40),
    };
  });

  let totalMotion = 0;
  for (let i = 1; i < processedFrames.length; i++) {
    totalMotion += processedFrames[i].amplitude.reduce(
      (sum, value, index) => sum + Math.abs(value - (processedFrames[i - 1].amplitude[index] ?? value)),
      0,
    );
  }
  const averageMotion = processedFrames.length > 1 ? totalMotion / (processedFrames.length - 1) : 0;
  const motionLevel = Math.min(100, Math.round(averageMotion * 5));
  const motionDetected = motionLevel > 10;
  const stillDurationSec = motionDetected ? 0 : processedFrames.length / 100;
  const edgeAlert = stillDurationSec > 120 ? "alert" : stillDurationSec > 60 ? "watch" : "none";

  const frameEnergy = processedFrames.map((frame) => sumSquares(frame.amplitude));
  const mean = average(frameEnergy);
  const snr = average(processedFrames.map((frame) => frame.snr));
  const features = processedFrames[0]?.amplitude.slice(0, 10).map((_, index) =>
    round3(average(processedFrames.map((frame) => frame.amplitude[index] ?? 0))),
  ) ?? [];

  return {
    processedFrames,
    screening: {
      motionDetected,
      motionLevel,
      stillDurationSec: round3(stillDurationSec),
      confidence: clamp01(0.5 + motionLevel / 200),
      latencyMs: Date.now() - started,
      needsCloudInference: !motionDetected && stillDurationSec > 30,
      edgeAlert,
    },
    cloudPayload: {
      features,
      motionStats: {
        mean: round3(mean),
        variance: round3(variance(frameEnergy)),
        peak: round3(frameEnergy.length ? Math.max(...frameEnergy) : 0),
      },
      snr: round3(snr),
    },
    processingMs: Date.now() - started,
    localOnly: true,
  };
}

function movingAverage(values: number[], size: number): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - 1), Math.min(values.length, index + size - 1));
    return average(slice);
  });
}

function unwrapPhase(values: number[]): number[] {
  const result = [values[0] ?? 0];
  for (let index = 1; index < values.length; index++) {
    let delta = (values[index] ?? 0) - (values[index - 1] ?? 0);
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    result.push(result[index - 1] + delta);
  }
  return result;
}

function simpleSpectrum(values: number[]): number[] {
  const mean = average(values);
  return values.slice(0, 30).map((value, index) => Math.abs(value - mean) / (index + 1));
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]): number {
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

function sumSquares(values: number[]): number {
  return values.reduce((sum, value) => sum + value * value, 0);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
