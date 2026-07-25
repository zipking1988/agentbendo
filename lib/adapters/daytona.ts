/**
 * Daytona 适配器 — 全栈线上部署
 *
 * 角色：管理 AgentBento 的线上部署环境。
 * - 一键创建/销毁 preview 环境
 * - 部署状态检查与日志获取
 * - 健康检查与自动回滚
 *
 * 黑客松演示场景：快速部署 demo 实例供评委访问
 */

function getDaytonaConfig() {
  return {
    apiKey: process.env.DAYTONA_API_KEY?.trim() ?? "",
    baseUrl: (process.env.DAYTONA_BASE_URL?.trim() || "https://api.daytona.io/api").replace(/\/$/, ""),
    defaultImage: process.env.DAYTONA_IMAGE?.trim() || "agentbento/agentbento:latest",
    region: process.env.DAYTONA_REGION?.trim() || "us-west-2",
  };
}

export function isDaytonaConfigured(): boolean {
  return Boolean(getDaytonaConfig().apiKey);
}

/* ─── 部署类型 ─── */

export type DeployStatus = "provisioning" | "building" | "deploying" | "running" | "healthy" | "unhealthy" | "stopped" | "failed";

export type DeployInfo = {
  id: string;
  status: DeployStatus;
  url: string;
  createdAt: string;
  image: string;
  region: string;
  logs?: string[];
};

export type DeployHealth = {
  healthy: boolean;
  uptimeSec: number;
  responseTimeMs: number;
  lastCheck: string;
  services: Array<{ name: string; status: "up" | "down" | "degraded" }>;
};

export type DeployRollback = {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  message: string;
};

/* ─── API 调用 ─── */

type DaytonaResponse = {
  id?: string;
  status?: string;
  url?: string;
  error?: { message?: string };
  [key: string]: unknown;
};

async function daytonaRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { apiKey, baseUrl } = getDaytonaConfig();
  if (!apiKey) throw new Error("DAYTONA_API_KEY not configured.");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let payload: DaytonaResponse;
  try {
    payload = JSON.parse(raw) as DaytonaResponse;
  } catch {
    throw new Error(`Daytona non-JSON (${response.status}).`);
  }
  if (!response.ok)
    throw new Error(payload.error?.message || `Daytona failed (${response.status}).`);
  return payload as unknown as T;
}

/* ─── 核心部署函数 ─── */

/**
 * 创建新的部署实例
 */
export async function createDeploy(options?: {
  image?: string;
  region?: string;
  envVars?: Record<string, string>;
  label?: string;
}): Promise<DeployInfo> {
  const config = getDaytonaConfig();
  const result = await daytonaRequest<{
    id: string;
    status: string;
    url?: string;
  }>("POST", "/deployments", {
    image: options?.image ?? config.defaultImage,
    region: options?.region ?? config.region,
    env: options?.envVars ?? {},
    label: options?.label ?? `agentbento-${Date.now()}`,
    resources: { cpu: "2", memory: "4Gi", storage: "10Gi" },
    autoScaling: { minReplicas: 1, maxReplicas: 3, targetCPU: 80 },
  });

  return {
    id: result.id ?? `dep-${Date.now()}`,
    status: (result.status as DeployStatus) ?? "provisioning",
    url: result.url ?? "",
    createdAt: new Date().toISOString(),
    image: options?.image ?? config.defaultImage,
    region: options?.region ?? config.region,
  };
}

/**
 * 获取部署状态
 */
export async function getDeployStatus(deployId: string): Promise<DeployInfo> {
  const result = await daytonaRequest<{
    id: string;
    status: string;
    url?: string;
    image?: string;
    region?: string;
    createdAt?: string;
  }>("GET", `/deployments/${deployId}`);

  return {
    id: result.id ?? deployId,
    status: (result.status as DeployStatus) ?? "unknown" as DeployStatus,
    url: result.url ?? "",
    createdAt: result.createdAt ?? "",
    image: result.image ?? getDaytonaConfig().defaultImage,
    region: result.region ?? getDaytonaConfig().region,
  };
}

/**
 * 获取部署日志
 */
export async function getDeployLogs(
  deployId: string,
  lines = 100
): Promise<string[]> {
  try {
    const result = await daytonaRequest<{ logs?: string[] }>(
      "GET",
      `/deployments/${deployId}/logs?lines=${lines}`
    );
    return result.logs ?? [];
  } catch {
    return ["[Daytona] Unable to fetch logs."];
  }
}

/**
 * 销毁部署实例
 */
export async function destroyDeploy(deployId: string): Promise<void> {
  await daytonaRequest("DELETE", `/deployments/${deployId}`);
}

/**
 * 健康检查 — 检测线上实例是否正常运行
 */
export async function checkDeployHealth(
  deployUrl: string
): Promise<DeployHealth> {
  const start = Date.now();
  try {
    const response = await fetch(`${deployUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const responseTimeMs = Date.now() - start;

    if (!response.ok) {
      return {
        healthy: false,
        uptimeSec: 0,
        responseTimeMs,
        lastCheck: new Date().toISOString(),
        services: [{ name: "app", status: "down" }],
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      healthy: true,
      uptimeSec: data.uptime ?? 0,
      responseTimeMs,
      lastCheck: new Date().toISOString(),
      services: data.services ?? [{ name: "app", status: "up" }],
    };
  } catch {
    return {
      healthy: false,
      uptimeSec: 0,
      responseTimeMs: Date.now() - start,
      lastCheck: new Date().toISOString(),
      services: [{ name: "app", status: "down" }],
    };
  }
}

/**
 * 回滚到上一个版本
 */
export async function rollbackDeploy(
  deployId: string
): Promise<DeployRollback> {
  try {
    const result = await daytonaRequest<{
      success?: boolean;
      fromVersion?: string;
      toVersion?: string;
      message?: string;
    }>("POST", `/deployments/${deployId}/rollback`);
    return {
      success: result.success ?? true,
      fromVersion: result.fromVersion ?? "current",
      toVersion: result.toVersion ?? "previous",
      message: result.message ?? "Rollback completed.",
    };
  } catch (error) {
    return {
      success: false,
      fromVersion: "current",
      toVersion: "previous",
      message: error instanceof Error ? error.message : "Rollback failed.",
    };
  }
}

/**
 * 一键部署完整 AgentBento 环境（黑客松演示用）
 */
export async function deployHackathonDemo(): Promise<{
  deploy: DeployInfo;
  dashboardUrl: string;
  apiEndpoint: string;
}> {
  const deploy = await createDeploy({
    label: "agentbento-hackathon-demo",
    envVars: {
      NODE_ENV: "production",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
  });

  return {
    deploy,
    dashboardUrl: deploy.url ? `${deploy.url}/dashboard` : "",
    apiEndpoint: deploy.url ? `${deploy.url}/api` : "",
  };
}
