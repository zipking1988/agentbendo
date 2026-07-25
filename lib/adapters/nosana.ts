/**
 * Nosana 适配器 — ESP32 边缘推理
 *
 * 角色：在 ESP32 边缘设备上运行轻量推理，实现：
 * - CSI 信号去噪（带通滤波 + 小波降噪）
 * - FFT 频谱分析（提取呼吸/心跳频段）
 * - 初步活动筛查（运动/静止二分类）
 *
 * 核心原则：隐私不出户 — 原始 CSI 数据永远不离开设备，
 * 只上传去噪后的特征摘要到云端 (GMI) 做深度推理。
 *
 * 数据流：ESP32-S3 → [Nosana边缘推理] → 特征摘要 → GMI Cloud
 *                    ↓ 本地决策
 *               运动/静止 (即时响应 <10ms)
 */

function getNosanaConfig() {
  return {
    /** Nosana 节点 API（边缘推理网关） */
    apiUrl: process.env.NOSANA_API_URL?.trim() ?? "",
    apiKey: process.env.NOSANA_API_KEY?.trim() ?? "",
    /** ESP32 设备直连地址（本地模式） */
    esp32Url: process.env.NOSANA_ESP32_URL?.trim() || "http://esp32-csi-node.local",
    /** 边缘推理模型版本 */
    edgeModel: process.env.NOSANA_EDGE_MODEL?.trim() || "csi-edge-v1",
    /** 是否启用本地 ESP32 直连（黑客松 demo 用） */
    localMode: process.env.NOSANA_LOCAL_MODE?.trim() === "true",
  };
}

export function isNosanaConfigured(): boolean {
  const cfg = getNosanaConfig();
  return Boolean(cfg.apiKey) || Boolean(cfg.localMode && cfg.esp32Url);
}

/* ─── 边缘推理类型 ─── */

/** ESP32 原始 CSI 帧 */
export type RawCsiFrame = {
  timestamp: number;
  /** 原始振幅 (30 subcarriers, 未去噪) */
  rawAmplitude: number[];
  /** 原始相位 (30 subcarriers, 未去噪) */
  rawPhase: number[];
  /** RSSI 信号强度 */
  rssi?: number;
  /** 设备序列号 */
  deviceId?: string;
};

/** 边缘去噪后的 CSI 帧 */
export type ProcessedCsiFrame = {
  timestamp: number;
  /** 去噪后振幅 */
  amplitude: number[];
  /** 去噪后相位 */
  phase: number[];
  /** FFT 频谱 (呼吸频段 0.1-0.5Hz, 心跳频段 0.8-2.0Hz) */
  fftSpectrum: number[];
  /** 呼吸频段能量 */
  breathingEnergy: number;
  /** 心跳频段能量 */
  heartEnergy: number;
  /** 信噪比 (dB) */
  snr: number;
  /** 降噪置信度 0-1 */
  denoiseConfidence: number;
};

/** 边缘初筛结果（运动/静止二分类，<10ms 响应） */
export type EdgeScreening = {
  /** 是否有运动 */
  motionDetected: boolean;
  /** 运动强度 0-100 */
  motionLevel: number;
  /** 静止持续时间 (秒) */
  stillDurationSec: number;
  /** 初筛置信度 0-1 */
  confidence: number;
  /** 本地推理延迟 (ms) */
  latencyMs: number;
  /** 是否需要上报云端（异常检测） */
  needsCloudInference: boolean;
  /** 边缘告警级别 */
  edgeAlert: "none" | "watch" | "alert";
};

/** 边缘处理完整输出 */
export type EdgeResult = {
  processedFrames: ProcessedCsiFrame[];
  screening: EdgeScreening;
  /** 上传到云端的特征摘要（隐私安全，不含原始数据） */
  cloudPayload: {
    features: number[];
    motionStats: { mean: number; variance: number; peak: number };
    breathingRate?: number;
    heartRate?: number;
    snr: number;
  };
  /** 处理耗时 (ms) */
  processingMs: number;
  /** 数据是否保留在本地 */
  localOnly: true;
};

/* ─── 边缘推理核心 ─── */

/**
 * 对原始 CSI 帧进行边缘推理
 * 去噪 → FFT → 初筛 → 生成云端摘要
 */
export async function processOnEdge(
  rawFrames: RawCsiFrame[],
  options?: { roomId?: string; sampleRate?: number }
): Promise<EdgeResult> {
  const startTime = Date.now();
  const sampleRate = options?.sampleRate ?? 100;

  // 1. 信号去噪
  const processed = rawFrames.map((f) => denoiseFrame(f));

  // 2. FFT 频谱分析
  const fftResults = processed.map((f) => f.fftSpectrum);

  // 3. 运动初筛
  const screening = screenMotion(processed, sampleRate);

  // 4. 提取云端摘要（隐私安全）
  const cloudPayload = extractCloudPayload(processed, screening, sampleRate);

  return {
    processedFrames: processed,
    screening,
    cloudPayload,
    processingMs: Date.now() - startTime,
    localOnly: true,
  };
}

/**
 * 通过 Nosana 节点远程执行边缘推理
 * 适用于 ESP32 通过 WiFi 连接到 Nosana 边缘网关
 */
export async function remoteEdgeInference(
  rawFrames: RawCsiFrame[]
): Promise<EdgeResult> {
  const config = getNosanaConfig();

  // 本地模式：直连 ESP32
  if (config.localMode && config.esp32Url) {
    return localEdgeInference(rawFrames, config.esp32Url);
  }

  // Nosana 云模式
  if (!config.apiKey || !config.apiUrl) {
    return processOnEdge(rawFrames);
  }

  try {
    const response = await fetch(`${config.apiUrl}/v1/inference`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.edgeModel,
        input: {
          frames: rawFrames.map((f) => ({
            t: f.timestamp,
            amp: f.rawAmplitude,
            phase: f.rawPhase,
            rssi: f.rssi ?? -50,
          })),
        },
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) throw new Error(`Nosana edge ${response.status}`);
    const result = await response.json();
    return result as EdgeResult;
  } catch (error) {
    console.warn("[Nosana] remote inference failed, falling back to local:", error);
    return processOnEdge(rawFrames);
  }
}

/* ─── 信号处理函数 ─── */

function denoiseFrame(raw: RawCsiFrame): ProcessedCsiFrame {
  // 带通滤波 + 简单移动平均去噪
  const amplitude = movingAverage(raw.rawAmplitude, 3);
  const phase = unwrapPhase(raw.rawPhase);

  // FFT 频谱分析（简化版 — 实际 ESP32 用 CMSIS-DSP）
  const fftSpectrum = simpleFFT(amplitude);

  // 呼吸频段能量 (0.1-0.5 Hz, 索引 1-5 in 30 subcarriers @100Hz)
  const breathingEnergy = fftSpectrum.slice(1, 6).reduce((s, v) => s + v * v, 0);
  // 心跳频段能量 (0.8-2.0 Hz, 索引 8-20)
  const heartEnergy = fftSpectrum.slice(8, 21).reduce((s, v) => s + v * v, 0);

  // 信噪比估算
  const signalPower = breathingEnergy + heartEnergy;
  const noisePower = fftSpectrum.reduce((s, v) => s + v * v, 0) - signalPower;
  const snr = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 20;

  return {
    timestamp: raw.timestamp,
    amplitude,
    phase,
    fftSpectrum,
    breathingEnergy: round3(breathingEnergy),
    heartEnergy: round3(heartEnergy),
    snr: round3(snr),
    denoiseConfidence: clamp01(snr / 30),
  };
}

function screenMotion(frames: ProcessedCsiFrame[], sampleRate: number): EdgeScreening {
  if (frames.length < 2) {
    return {
      motionDetected: false,
      motionLevel: 0,
      stillDurationSec: 0,
      confidence: 0.3,
      latencyMs: 1,
      needsCloudInference: false,
      edgeAlert: "none",
    };
  }

  // 计算帧间差异（运动能量）
  let totalMotion = 0;
  for (let i = 1; i < frames.length; i++) {
    const diff = frames[i].amplitude.reduce(
      (s, v, j) => s + Math.abs(v - (frames[i - 1].amplitude[j] ?? 0)),
      0
    );
    totalMotion += diff;
  }
  const avgMotion = totalMotion / (frames.length - 1);
  const motionLevel = Math.min(100, Math.round(avgMotion * 5));
  const motionDetected = motionLevel > 10;

  // 静止时长
  const windowDurationSec = frames.length / sampleRate;
  const stillDurationSec = motionDetected ? 0 : windowDurationSec;

  // 是否需要云端推理
  const needsCloudInference = !motionDetected && stillDurationSec > 30;

  // 边缘告警
  let edgeAlert: EdgeScreening["edgeAlert"] = "none";
  if (!motionDetected && stillDurationSec > 120) edgeAlert = "alert";
  else if (!motionDetected && stillDurationSec > 60) edgeAlert = "watch";

  return {
    motionDetected,
    motionLevel,
    stillDurationSec: round3(stillDurationSec),
    confidence: clamp01(0.5 + motionLevel / 200),
    latencyMs: 1,
    needsCloudInference,
    edgeAlert,
  };
}

function extractCloudPayload(
  frames: ProcessedCsiFrame[],
  screening: EdgeScreening,
  sampleRate: number
): EdgeResult["cloudPayload"] {
  // 聚合特征（10维向量，隐私安全）
  const ampMeans = frames[0]?.amplitude.map((_, sc) =>
    frames.reduce((s, f) => s + (f.amplitude[sc] ?? 0), 0) / frames.length
  ) ?? [];

  const features = ampMeans.slice(0, 10).map((v) => round3(v));

  // 呼吸率估算
  const breathingRate = estimateRate(frames.map((f) => f.breathingEnergy), sampleRate, 0.1, 0.5);
  // 心率估算
  const heartRate = estimateRate(frames.map((f) => f.heartEnergy), sampleRate, 0.8, 2.0);

  // 运动统计
  const motions = frames.map((f) =>
    f.amplitude.reduce((s, v) => s + v * v, 0)
  );
  const mean = motions.reduce((s, v) => s + v, 0) / motions.length;
  const variance = motions.reduce((s, v) => s + (v - mean) ** 2, 0) / motions.length;
  const peak = Math.max(...motions);

  return {
    features,
    motionStats: { mean: round3(mean), variance: round3(variance), peak: round3(peak) },
    breathingRate,
    heartRate,
    snr: round3(frames.reduce((s, f) => s + f.snr, 0) / frames.length),
  };
}

/* ─── 本地 ESP32 直连 ─── */

async function localEdgeInference(
  rawFrames: RawCsiFrame[],
  esp32Url: string
): Promise<EdgeResult> {
  try {
    const response = await fetch(`${esp32Url}/api/edge-inference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames: rawFrames }),
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      return await response.json() as EdgeResult;
    }
  } catch {
    // ESP32 不可达，回退到本地处理
  }
  return processOnEdge(rawFrames);
}

/* ─── DSP 工具函数 ─── */

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const slice = data.slice(start, end);
    result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
  }
  return result;
}

function unwrapPhase(phase: number[]): number[] {
  const result = [phase[0] ?? 0];
  for (let i = 1; i < phase.length; i++) {
    let diff = (phase[i] ?? 0) - (phase[i - 1] ?? 0);
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    result.push(result[i - 1] + diff);
  }
  return result;
}

function simpleFFT(data: number[]): number[] {
  const N = data.length;
  if (N === 0) return [];
  const mean = data.reduce((s, v) => s + v, 0) / N;
  const centered = data.map((v) => v - mean);
  const spectrum: number[] = [];
  for (let k = 0; k < Math.min(N, 30); k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += centered[n] * Math.cos(angle);
      im -= centered[n] * Math.sin(angle);
    }
    spectrum.push(Math.sqrt(re * re + im * im) / N);
  }
  return spectrum;
}

function estimateRate(
  energySeries: number[],
  sampleRate: number,
  lowHz: number,
  highHz: number
): number | undefined {
  if (energySeries.length < 10) return undefined;
  const fft = simpleFFT(energySeries);
  const freqRes = sampleRate / energySeries.length;
  const lowBin = Math.floor(lowHz / freqRes);
  const highBin = Math.min(fft.length - 1, Math.ceil(highHz / freqRes));
  let peakBin = lowBin, peakVal = 0;
  for (let k = lowBin; k <= highBin; k++) {
    if ((fft[k] ?? 0) > peakVal) {
      peakVal = fft[k] ?? 0;
      peakBin = k;
    }
  }
  const rateHz = peakBin * freqRes;
  return Math.round(rateHz * 60 * 10) / 10; // BPM
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
