import { DashboardApp } from "@/app/dashboard/DashboardApp";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import "./dashboard-product.css";

export const metadata: Metadata = {
  title: "Family Dashboard — Agent Bento",
  description: "Place the demo router and follow Grandpa’s simulated family care story.",
};

type DashboardPageProps = {
  searchParams: Promise<{ start?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const autoStart = params.start === "1";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand-group">
          <Link className="wordmark" href="/" aria-label="Agent Bento home">
            <Image className="wordmark-mark" src="/agent-bento-mark.png" alt="" width={52} height={52} priority />
            <span>AGENT BENTO</span>
          </Link>
          <span className="dashboard-view-label">Family view</span>
        </div>
        <div className="dashboard-header-actions">
          <div className="trust-notes">
            <div className="privacy-note">
              <IconShieldCheck size={17} />
              <span>No cameras. No recordings.</span>
            </div>
            <p className="demo-notice">Interactive demo — sensing, delivery and notifications are simulated.</p>
          </div>
          <Link className="dashboard-site-link" href="/" aria-label="Back to site">
            <IconArrowLeft size={17} stroke={1.8} aria-hidden="true" />
            <span>Back to site</span>
          </Link>
        </div>
      </header>

      <DashboardApp autoStart={autoStart} />
    </main>
  );
}
