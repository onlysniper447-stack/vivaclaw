"use client";

import { useEffect, useRef } from "react";
import styles from "./HomeAnimatedBackground.module.css";

const BLOCKS = [
  { top: "14%", left: "7%", size: 86, rot: 8, delay: "0s", duration: "18s", accent: true },
  { top: "22%", left: "78%", size: 54, rot: -12, delay: "-4s", duration: "15s", accent: false },
  { top: "58%", left: "12%", size: 40, rot: 18, delay: "-7s", duration: "20s", accent: false },
  { top: "68%", left: "71%", size: 96, rot: -6, delay: "-2s", duration: "22s", accent: true },
  { top: "36%", left: "48%", size: 28, rot: 32, delay: "-9s", duration: "14s", accent: false },
  { top: "8%", left: "38%", size: 46, rot: -20, delay: "-5s", duration: "17s", accent: false },
  { top: "76%", left: "42%", size: 34, rot: 10, delay: "-11s", duration: "19s", accent: true },
] as const;

const PARTICLES = [
  { top: "12%", left: "18%", delay: "0s", duration: "9s", dim: false },
  { top: "19%", left: "63%", delay: "-1.4s", duration: "11s", dim: true },
  { top: "28%", left: "31%", delay: "-2.2s", duration: "8s", dim: false },
  { top: "34%", left: "86%", delay: "-3.1s", duration: "12s", dim: true },
  { top: "41%", left: "9%", delay: "-0.8s", duration: "10s", dim: false },
  { top: "47%", left: "54%", delay: "-4.5s", duration: "13s", dim: true },
  { top: "53%", left: "73%", delay: "-2.8s", duration: "9s", dim: false },
  { top: "61%", left: "24%", delay: "-5.2s", duration: "11s", dim: true },
  { top: "69%", left: "88%", delay: "-1.1s", duration: "8s", dim: false },
  { top: "74%", left: "46%", delay: "-3.7s", duration: "12s", dim: true },
  { top: "81%", left: "16%", delay: "-6s", duration: "10s", dim: false },
  { top: "16%", left: "91%", delay: "-4.1s", duration: "14s", dim: true },
  { top: "88%", left: "61%", delay: "-2s", duration: "9s", dim: false },
  { top: "8%", left: "52%", delay: "-7s", duration: "13s", dim: true },
  { top: "39%", left: "41%", delay: "-3.4s", duration: "11s", dim: false },
  { top: "57%", left: "5%", delay: "-5.8s", duration: "10s", dim: true },
] as const;

export function HomeAnimatedBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const box = root.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return;
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        root.style.setProperty("--px", x.toFixed(4));
        root.style.setProperty("--py", y.toFixed(4));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.cell} />
      <div className={styles.ambientA} />
      <div className={styles.ambientB} />
      <div className={styles.ambientC} />

      <svg className={styles.circuits} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <path
          className={styles.trace}
          d="M80 120 H320 V260 H520 V140 H760 V420 H980 V220 H1320"
        />
        <path
          className={`${styles.trace} ${styles.traceSlow}`}
          d="M40 640 H260 V480 H510 V700 H820 V540 H1100 V760 H1400"
        />
        <path className={styles.trace} d="M180 800 V520 H400 V360 H640" />
        <path className={`${styles.trace} ${styles.traceSlow}`} d="M1280 80 V300 H1040 V480" />
        <circle className={styles.node} cx="320" cy="260" r="2.5" />
        <circle className={styles.node} cx="760" cy="140" r="2.5" />
        <circle className={styles.node} cx="980" cy="420" r="2.5" />
        <circle className={styles.node} cx="510" cy="700" r="2.5" />
        <circle className={styles.node} cx="640" cy="360" r="2.5" />
        <circle className={styles.node} cx="1040" cy="300" r="2.5" />
      </svg>

      <div className={styles.blocks}>
        {BLOCKS.map((block) => (
          <span
            key={`${block.top}-${block.left}`}
            className={block.accent ? `${styles.block} ${styles.blockAccent}` : styles.block}
            style={{
              top: block.top,
              left: block.left,
              width: block.size,
              height: block.size,
              animationDelay: block.delay,
              animationDuration: block.duration,
              ["--rot" as string]: `${block.rot}deg`,
            }}
          />
        ))}
      </div>

      <div className={styles.particles}>
        {PARTICLES.map((particle) => (
          <span
            key={`${particle.top}-${particle.left}`}
            className={particle.dim ? `${styles.particle} ${styles.particleDim}` : styles.particle}
            style={{
              top: particle.top,
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
}
