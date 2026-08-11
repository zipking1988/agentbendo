/**
 * GMI Cloud 适配器 — CSI 数据流处理 + 活动状态置信度推理
 *
 * 角色：接收 ESP32 CSI 原始数据流，通过 GMI Cloud GPU 推理
 * 输出活动状态置信度分数，供 Qwen Agent 做分级决策。
 *
 * 数据流：ESP32 → 本地特征提取 → GMI Cloud 推理 → 活动置信度
 */

function getGmiConfig() {
  return {
    apiKey: process.env.GMI_API_KEY?.trim() ?? "",
    baseUrl: (process.env.GMI_BASE_URL?.trim() || "https://api.gmi-serving.com/v1").replace(/\/$/, ""),
    csiModel: process.env.GMI_CSI_MODEL?.trim() || "Qwen/Qwen3.8-Max",
  };
}

export function isGmiConfigured(): boolean {
  return Boolean(getGmiConfig().apiKey);
}

/* ─── CSI 数据类型 ─── */

/** 单帧 CSI 数据（在设备侧预处理后传入） */
export type CsiFrame = {
  timestamp: number;
  /** 去噪后的振幅序列 (30 subcarriers) */
  amplitude: number[];
  /** 去噪后的相位序列 (30 subcarriers) */
  phase: number[];
  /** FFT 频谱能量分布 */
  fftSpectrum?: number[];
  /** 信噪比 (dB) */
  snr?: number;
};

/** CSI 滑动窗口（多帧聚合） */
export type CsiWindow = {
  frames: CsiFrame[];
  /** 窗口时长 (秒) */
  durationSec: number;
  /** 采样率 (Hz) */
  sampleRate: number;
  /** 房间标识 */
  roomId: string;
};

/** 活动状态推理结果 */
export type ActivityInference = {
  /** 检测到的活动类型 */
  activity: "walking" | "sitting" | "lying" | "cooking" | "bathing" | "fall" | "still" | "unknown";
  /** 置信度 0.0-1.0 */
  confidence: number;
  /** 次可能的活动 */
  secondaryActivity?: string;
  secondaryConfidence?: number;
  /** 推理延迟 ms */
  inferenceMs: number;
  /** 使用的模型版本 */
  modelVersion: string;
  /** 原始概率分布 */
  probabilities: Record<string, number>;
};

/** 活动状态时间线（连续推理结果） */
export type ActivityTimeline = {
  roomId: string;
  entries: Array<{
    timestamp: number;
    activity: string;
    confidence: number;
  }>;
  /** 异常静止时长 (秒) — 超过阈值触发告警 */
  stillDurationSec: number;
  /** 运动量指数 (0-100) */
  motionIndex: number;
  /** 异常分数 (0-1) — 偏离日常模式的程度 */
  anomalyScore: number;
};

/* ─── GMI API 调用 ─── */

type GmiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

async function callGmiCsi(
  systemPrompt: string,
  payload: unknown,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const { apiKey, baseUrl, csiModel } = getGmiConfig();
  if (!apiKey || !csiModel) {
    throw new Error("GMI_API_KEY and GMI_CSI_MODEL must both be configured.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: csiModel,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  const rawText = await response.text();
  let data: GmiResponse;
  try {
    data = JSON.parse(rawText) as GmiResponse;
  } catch {
    throw new Error(`GMI non-JSON (${response.status}).`);
  }
  if (!response.ok)
    throw new Error(data.error?.message || `GMI failed (${response.status}).`);
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/* ─── 核心推理函数 ─── */

/**
 * 对 CSI 窗口进行活动状态推理
 * 输入预处理后的 CSI 窗口，输出活动分类 + 置信度
 */
export async function inferActivity(
  window: CsiWindow
): Promise<ActivityInference> {
  const startTime = Date.now();

  const systemPrompt = `You are a WiFi CSI activity recognition model.
Analyze the CSI window data and classify the human activity.
Return ONLY valid JSON:
{
  "activity": "walking|sitting|lying|cooking|bathing|fall|still|unknown",
  "confidence": 0.0-1.0,
  "secondaryActivity": "string|null",
  "secondaryConfidence": 0.0-1.0,
  "probabilities": {"walking":0.1,"sitting":0.8,...}
}`;

  // 提取特征摘要（减少 token 传输）
  const featureSummary = extractFeatureSummary(window);

  try {
    const raw = await callGmiCsi(systemPrompt, {
      room: window.roomId,
      duration: window.durationSec,
      sampleRate: window.sampleRate,
      frameCount: window.frames.length,
      features: featureSummary,
    });

    const parsed = JSON.parse(raw);
    return {
      activity: parsed.activity ?? "unknown",
      confidence: clamp01(parsed.confidence ?? 0.5),
      secondaryActivity: parsed.secondaryActivity,
      secondaryConfidence: parsed.secondaryConfidence,
      inferenceMs: Date.now() - startTime,
      modelVersion: getGmiConfig().csiModel,
      probabilities: parsed.probabilities ?? {},
    };
  } catch (error) {
    console.warn("[GMI CSI] inference failed, using fallback:", error);
    return fallbackInference(window);
  }
}

/**
 * 批量推理 — 处理 CSI 数据流（多个连续窗口）
 * 返回活动状态时间线
 */
export async function inferActivityStream(
  windows: CsiWindow[]
): Promise<ActivityTimeline> {
  const results = await Promise.all(
    windows.map((w) => inferActivity(w).catch(() => fallbackInference(w)))
  );

  const roomId = windows[0]?.roomId ?? "unknown";
  const entries = results.map((r, i) => ({
    timestamp: windows[i].frames[0]?.timestamp ?? Date.now(),
    activity: r.activity,
    confidence: r.confidence,
  }));

  // 计算统计指标
  const stillFrames = results.filter((r) => r.activity === "still" || r.activity === "lying");
  const stillDurationSec = stillFrames.length > 0
    ? stillFrames.length * (windows[0]?.durationSec ?? 5)
    : 0;

  const motionActivities = ["walking", "cooking"];
  const motionFrames = results.filter((r) => motionActivities.includes(r.activity));
  const motionIndex = Math.min(100, Math.round((motionFrames.length / Math.max(1, results.length)) * 100));

  // 异常分数：基于活动分布的熵和静止比例
  const anomalyScore = computeAnomalyScore(results);

  return { roomId, entries, stillDurationSec, motionIndex, anomalyScore };
}

/* ─── 特征提取 ─── */

function extractFeatureSummary(window: CsiWindow) {
  const amplitudes = window.frames.map((f) => f.amplitude);
  const phases = window.frames.map((f) => f.phase);

  // 振幅统计
  const ampMeans = amplitudes[0]?.map((_, sc) =>
    amplitudes.reduce((s, a) => s + (a[sc] ?? 0), 0) / amplitudes.length
  ) ?? [];
  const ampVariance = amplitudes[0]?.map((_, sc) => {
    const mean = ampMeans[sc] ?? 0;
    return amplitudes.reduce((s, a) => s + Math.pow((a[sc] ?? 0) - mean, 2), 0) / amplitudes.length;
  }) ?? [];

  // 相位统计
  const phaseVariance = phases[0]?.map((_, sc) => {
    const vals = phases.map((p) => p[sc] ?? 0);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    return vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
  }) ?? [];

  // 运动能量（振幅方差之和）
  const motionEnergy = ampVariance.reduce((s, v) => s + v, 0);

  return {
    amplitudeMean: ampMeans.slice(0, 10).map((v) => round3(v)),
    amplitudeVariance: ampVariance.slice(0, 10).map((v) => round3(v)),
    phaseVariance: phaseVariance.slice(0, 10).map((v) => round3(v)),
    motionEnergy: round3(motionEnergy),
    avgSnr: round3(
      window.frames.reduce((s, f) => s + (f.snr ?? 0), 0) / Math.max(1, window.frames.length)
    ),
    fftPeak: window.frames[0]?.fftSpectrum
      ? round3(Math.max(...window.frames[0].fftSpectrum))
      : null,
  };
}

function computeAnomalyScore(results: ActivityInference[]): number {
  if (results.length === 0) return 0;
  const stillRatio = results.filter((r) => r.activity === "still" || r.activity === "unknown").length / results.length;
  const lowConfRatio = results.filter((r) => r.confidence < 0.5).length / results.length;
  const fallCount = results.filter((r) => r.activity === "fall").length;
  return clamp01(stillRatio * 0.4 + lowConfRatio * 0.3 + Math.min(1, fallCount * 0.3));
}

/* ─── 降级 Fallback ─── */

function fallbackInference(window: CsiWindow): ActivityInference {
  // 简单启发式：基于振幅方差估算
  const variance = window.frames.length > 1
    ? window.frames.reduce((s, f, i) => {
        if (i === 0) return 0;
        const prev = window.frames[i - 1];
        const diff = f.amplitude.reduce((d, a, j) => d + Math.abs(a - (prev.amplitude[j] ?? 0)), 0);
        return s + diff;
      }, 0) / (window.frames.length - 1)
    : 0;

  let activity: ActivityInference["activity"] = "unknown";
  let confidence = 0.3;

  if (variance > 50) { activity = "walking"; confidence = 0.5; }
  else if (variance > 20) { activity = "cooking"; confidence = 0.4; }
  else if (variance > 5) { activity = "sitting"; confidence = 0.5; }
  else if (variance > 0.1) { activity = "still"; confidence = 0.4; }
  else { activity = "still"; confidence = 0.6; }

  return {
    activity,
    confidence,
    inferenceMs: 0,
    modelVersion: "fallback-heuristic",
    probabilities: { [activity]: confidence },
  };
}

/* ─── 工具函数 ─── */

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
