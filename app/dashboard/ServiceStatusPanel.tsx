"use client";

import type { ServiceStatus } from "@/lib/ai-router";
import IconBowlChopsticks from "@tabler/icons-react/dist/esm/icons/IconBowlChopsticks.mjs";
import IconCheck from "@tabler/icons-react/dist/esm/icons/IconCheck.mjs";
import IconCloud from "@tabler/icons-react/dist/esm/icons/IconCloud.mjs";
import IconExclamationCircle from "@tabler/icons-react/dist/esm/icons/IconExclamationCircle.mjs";
import IconRobot from "@tabler/icons-react/dist/esm/icons/IconRobot.mjs";
import IconShield from "@tabler/icons-react/dist/esm/icons/IconShield.mjs";
import IconWorld from "@tabler/icons-react/dist/esm/icons/IconWorld.mjs";
import { useEffect, useState } from "react";

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "Qwen Cloud": <IconPhotoScan size={14} />,
  "GMI Cloud": <IconWorld size={14} />,
  Daytona: <IconCloud size={14} />,
  "ai&": <IconShield size={14} />,
  StepFun: <IconRobot size={14} />,
};

function IconPhotoScan({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span
      className="service-dot"
      style={{
        width: 8, height: 8, borderRadius: "50%",
        background: configured ? "#7cff6b" : "#ff5a5a",
        boxShadow: configured ? "0 0 8px rgba(124,255,107,0.5)" : "0 0 8px rgba(255,90,90,0.4)",
        flexShrink: 0,
      }}
    />
  );
}

export function ServiceStatusPanel() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/service-status")
      .then((res) => res.json())
      .then((data: { services: ServiceStatus[] }) => {
        if (cancelled) return;
        setServices(data.services ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const configuredCount = services.filter((s) => s.configured).length;
  const totalCount = services.length;

  return (
    <div className="service-status-panel" aria-label="AI service status">
      <div className="dashboard-panel-head">
        <p className="dashboard-panel-kicker">AI SERVICES</p>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 560, letterSpacing: "-0.03em" }}>
          {loading ? "Checking…" : error ? "Unavailable" : `${configuredCount}/${totalCount} online`}
        </h2>
      </div>

      {loading ? (
        <p style={{ color: "#8c9890", fontSize: 12 }}>Loading service status…</p>
      ) : error ? (
        <p style={{ color: "#ff7650", fontSize: 12 }}>{error}</p>
      ) : (
        <ul className="service-list" style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {services.map((svc) => (
            <li
              key={svc.name}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                border: `1px solid ${svc.configured ? "rgba(124,255,107,0.22)" : "rgba(255,90,90,0.18)"}`,
                background: svc.configured ? "rgba(124,255,107,0.05)" : "rgba(255,90,90,0.04)",
                fontSize: 12,
              }}
            >
              <StatusDot configured={svc.configured} />
              <span style={{ fontWeight: 600, color: svc.configured ? "#d8f5dc" : "#ff9a9a", minWidth: 90 }}>
                {svc.name}
              </span>
              <span style={{ color: "#8c9890", fontSize: 11 }}>{svc.role}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: svc.configured ? "#7cff6b" : "#ff5a5a" }}>
                {svc.configured ? <><IconCheck size={12} /> Ready</> : <><IconExclamationCircle size={12} /> Off</>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 12, padding: "8px 10px", border: "1px solid rgba(184,255,84,0.15)", background: "rgba(184,255,84,0.03)", fontSize: 11, color: "#7f8c83", lineHeight: 1.5 }}>
        <strong style={{ color: "#aab4ac" }}>Routing:</strong> Qwen → floor plans · GMI → translations · Daytona → sandboxes · ai& → Japan-only privacy
      </div>
    </div>
  );
}
