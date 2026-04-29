"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────
interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  velocity: number;
  spin: number;
  scale: number;
  delay: number;
}

interface BurstOrigin {
  x: number;
  y: number;
}

// ─── Config ─────────────────────────────────────────────────────────
const EMOJIS = ["🦄", "⭐", "✨", "🌟", "💫", "🎉", "🦄", "⭐", "✨", "🌟"];
const PARTICLE_COUNT = 28;
const DURATION_MS = 1800;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createParticles(origin: BurstOrigin): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    x: origin.x,
    y: origin.y,
    angle: (360 / PARTICLE_COUNT) * i + randomBetween(-15, 15),
    velocity: randomBetween(120, 320),
    spin: randomBetween(-720, 720),
    scale: randomBetween(0.6, 1.6),
    delay: randomBetween(0, 150),
  }));
}

// ─── Burst component (renders one explosion) ────────────────────────
function Burst({ origin, onDone }: { origin: BurstOrigin; onDone: () => void }) {
  const [particles] = useState(() => createParticles(origin));

  useEffect(() => {
    const t = setTimeout(onDone, DURATION_MS + 200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * p.velocity;
        const dy = Math.sin(rad) * p.velocity;

        return (
          <span
            key={p.id}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              fontSize: `${p.scale * 1.5}rem`,
              opacity: 0,
              animation: `cb-explode ${DURATION_MS}ms cubic-bezier(.15,.8,.3,1) ${p.delay}ms forwards`,
              ["--cb-dx" as string]: `${dx}px`,
              ["--cb-dy" as string]: `${dy}px`,
              ["--cb-spin" as string]: `${p.spin}deg`,
            }}
          >
            {p.emoji}
          </span>
        );
      })}

      <style>{`
        @keyframes cb-explode {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0) rotate(0deg);
          }
          15% {
            opacity: 1;
            transform: translate(
              calc(var(--cb-dx) * 0.3),
              calc(var(--cb-dy) * 0.3)
            ) scale(1.3) rotate(calc(var(--cb-spin) * 0.2));
          }
          60% {
            opacity: 1;
            transform: translate(
              calc(var(--cb-dx) * 0.85),
              calc(var(--cb-dy) * 0.85 + 30px)
            ) scale(1) rotate(calc(var(--cb-spin) * 0.7));
          }
          100% {
            opacity: 0;
            transform: translate(
              var(--cb-dx),
              calc(var(--cb-dy) + 80px)
            ) scale(0.3) rotate(var(--cb-spin));
          }
        }
      `}</style>
    </div>
  );
}

// ─── Hook: useCelebration ───────────────────────────────────────────
// Returns [triggerCelebration, CelebrationLayer]
// - triggerCelebration(e): call with the React mouse event (or just pass to onClick)
// - CelebrationLayer: render this component somewhere in your JSX (once per page)
export function useCelebration() {
  const [bursts, setBursts] = useState<{ id: number; origin: BurstOrigin }[]>([]);
  const nextId = useRef(0);

  const trigger = useCallback((e: React.MouseEvent | { clientX: number; clientY: number }) => {
    const id = nextId.current++;
    setBursts((prev) => [...prev, { id, origin: { x: e.clientX, y: e.clientY } }]);
  }, []);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const CelebrationLayer = useCallback(
    () => (
      <>
        {bursts.map((b) => (
          <Burst key={b.id} origin={b.origin} onDone={() => removeBurst(b.id)} />
        ))}
      </>
    ),
    [bursts, removeBurst]
  );

  return [trigger, CelebrationLayer] as const;
}

// ─── Standalone component (backwards-compatible, explodes from center) ──
export default function CelebrationBurst() {
  const origin = {
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 400,
  };

  return <Burst origin={origin} onDone={() => {}} />;
}
