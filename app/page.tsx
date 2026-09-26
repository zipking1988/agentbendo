import Image from "next/image";
import Link from "next/link";
import IconArrowRight from "@tabler/icons-react/dist/esm/icons/IconArrowRight.mjs";
import IconCircleCheckFilled from "@tabler/icons-react/dist/esm/icons/IconCircleCheckFilled.mjs";
import IconHeartHandshake from "@tabler/icons-react/dist/esm/icons/IconHeartHandshake.mjs";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import styles from "./landing.module.css";

const CARE_STEPS = [
  {
    number: "01",
    title: "Notice a change",
    body: "Ambient Wi-Fi sensing notices when everyday movement becomes unusually still.",
  },
  {
    number: "02",
    title: "Send a human check-in",
    body: "A familiar bento delivery creates a warm, natural reason for someone to knock.",
  },
  {
    number: "03",
    title: "Keep family informed",
    body: "Family gets the context they need, without constant alerts or a camera feed.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.wordmark} href="#top" aria-label="Agent Bento home">
          <Image src="/agent-bento-mark.png" alt="" width={48} height={48} priority />
          <span>AGENT BENTO</span>
        </a>

        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-families">For families</a>
          <a href="#privacy">Privacy</a>
          <a href="#about">About</a>
        </nav>

        <Link className={styles.headerCta} href="/dashboard">
          See the family experience
          <IconArrowRight size={18} stroke={1.8} aria-hidden="true" />
        </Link>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="hero-title">
        <Image
          className={styles.heroImage}
          src="/agent-bento-home-hero-v2.webp"
          alt="An older man reading at home in the evening near an ambient Wi-Fi sensing router"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroShade} aria-hidden="true" />

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}><span /> Privacy-first care</p>
          <h1 id="hero-title">A home can<br />ask for help.</h1>
          <p className={styles.heroBody}>
            Agent Bento notices unusual stillness through Wi-Fi, sends a familiar human check-in,
            and keeps family informed—without cameras or wearables.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/dashboard">
              See the family experience
              <IconArrowRight size={20} stroke={1.8} aria-hidden="true" />
            </Link>
            <a className={styles.secondaryCta} href="#how-it-works">How it works</a>
          </div>
          <p className={styles.privacyPromise}>
            <IconShieldCheck size={21} stroke={1.7} aria-hidden="true" />
            No cameras. No microphones. No recordings.
          </p>
        </div>

        <div className={styles.homeStatus} role="status">
          <IconCircleCheckFilled size={17} aria-hidden="true" />
          <span>Movement looks normal</span>
        </div>
      </section>

      <section className={styles.steps} id="how-it-works" aria-labelledby="steps-title">
        <div className={styles.stepsIntro}>
          <p className={styles.eyebrow}><span /> How Agent Bento helps</p>
          <h2 id="steps-title">Simple steps.<br />Real peace of mind.</h2>
        </div>
        <div className={styles.stepList}>
          {CARE_STEPS.map(({ number, title, body }) => (
            <article className={styles.step} key={number}>
              <div className={styles.stepNumber}>{number}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.careSection} id="about" aria-labelledby="care-title">
        <div className={styles.careStatement}>
          <p className={styles.eyebrow}><span /> A respectful safety net</p>
          <h2 id="care-title">Technology stays quiet.<br />Human care shows up.</h2>
          <p>
            Agent Bento is designed for people who value their independence—and for families who
            want reassurance without turning a home into a surveillance system.
          </p>
        </div>
        <div className={styles.careDetails}>
          <article>
            <span>01</span>
            <h3>Sensing that stays in the background</h3>
            <p>It reads changes in Wi-Fi reflections, never faces, voices, or private moments.</p>
          </article>
          <article>
            <span>02</span>
            <h3>A check-in that feels familiar</h3>
            <p>A warm meal and a friendly knock make care feel human instead of clinical.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Clear context for the right people</h3>
            <p>Family sees what is happening and can step in only when the situation needs them.</p>
          </article>
        </div>
      </section>

      <section className={styles.familySection} id="for-families" aria-labelledby="family-title">
        <div className={styles.familyImageWrap}>
          <Image
            className={styles.familyImage}
            src="/agent-bento-resident.webp"
            alt="An independent older woman at home in a sage kimono-style cardigan"
            width={1152}
            height={1536}
            loading="eager"
            sizes="(max-width: 760px) 100vw, 42vw"
          />
          <span>Inspired by someone who values her independence.</span>
        </div>
        <div className={styles.familyCopy}>
          <p className={styles.eyebrow}><span /> Made for families</p>
          <h2 id="family-title">Reassurance without hovering.</h2>
          <p>
            The family view turns a quiet signal into a clear care story: what changed, who is
            checking in, and whether your loved one answered.
          </p>
          <ul>
            <li><IconCircleCheckFilled size={18} aria-hidden="true" /> Calm, plain-language status</li>
            <li><IconCircleCheckFilled size={18} aria-hidden="true" /> Human check-ins before escalation</li>
            <li><IconCircleCheckFilled size={18} aria-hidden="true" /> Technical details stay out of the way</li>
          </ul>
          <Link className={styles.textCta} href="/dashboard">
            Explore the family demo
            <IconArrowRight size={19} stroke={1.8} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className={styles.privacySection} id="privacy" aria-labelledby="privacy-title">
        <IconShieldCheck size={34} stroke={1.5} aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>Privacy is the product</p>
          <h2 id="privacy-title">Motion patterns, never images.</h2>
          <p>
            The demo simulates sensing, delivery, and notifications. It does not use a camera,
            microphone, or recording from a real home.
          </p>
        </div>
        <Link className={styles.secondaryCta} href="/dashboard">Open interactive demo</Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/agent-bento-mark.png" alt="" width={38} height={38} />
          <span>AGENT BENTO</span>
        </div>
        <p><IconHeartHandshake size={18} aria-hidden="true" /> Designed for independence. Built for peace of mind.</p>
        <Link href="/dashboard">Family demo <IconArrowRight size={16} aria-hidden="true" /></Link>
      </footer>
    </main>
  );
}
