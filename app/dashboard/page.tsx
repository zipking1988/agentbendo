import { DashboardApp } from "@/app/dashboard/DashboardApp";
import IconBowlChopsticks from "@tabler/icons-react/dist/esm/icons/IconBowlChopsticks.mjs";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Family Dashboard — Agent Bento",
  description: "Set up your home floor plan, label rooms, pin Wi‑Fi sensing, and watch Grandpa’s care status.",
};

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="wordmark" href="/" aria-label="Agent Bento home">
          <span className="wordmark-icon" aria-hidden="true">
            <IconBowlChopsticks size={25} stroke={1.7} />
          </span>
          <span>AGENT BENTO</span>
        </Link>
        <div className="privacy-note">
          <IconShieldCheck size={17} />
          <span>No cameras. No recordings.</span>
        </div>
      </header>

      <DashboardApp />
    </main>
  );
}
